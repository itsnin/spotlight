import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

import { getDataPath } from '../common/constants.js';
import { ClipboardHistory } from '../common/settings.js';
import { ClipboardEntry } from './database.js';

const DATABASE_VERSION = 2;

function new_connection(Gda, cncString) {
	if (Gda.__version__ === '6.0') {
		// Gda 6
		return new Gda.Connection({
			provider: Gda.Config.get_provider('SQLite'),
			cncString,
		});
	} else {
		// Gda 5
		const conn = Gda.Connection.new_from_string('SQLite', cncString, null, Gda.ConnectionOptions.THREAD_ISOLATED);
		if (conn.cnc_string === cncString) return conn;

		// Workaround for database not being stored only in home location
		// Two <user>:<password>@ pairs are required since the first is stripped at creation and the second is stripped
		// while opening the connection.
		cncString = `:@:@${cncString}`;
		return Gda.Connection.new_from_string('SQLite', cncString, null, Gda.ConnectionOptions.THREAD_ISOLATED);
	}
}

function open_async(connection) {
	return new Promise((resolve, reject) => {
		if ('open_async' in connection) {
			// Gda 6
			GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
				try {
					connection.set_main_context(null, GLib.MainContext.ref_thread_default());
					connection.open_async((_cnc, _jobId, result) => resolve(result));
				} catch (error) {
					reject(error);
				}
				return GLib.SOURCE_REMOVE;
			});
		} else {
			// Gda 5
			resolve(connection.open());
		}
	});
}

function add_expr_value(builder, value) {
	if (builder.add_expr_value.length === 1) {
		return builder.add_expr_value(value);
	} else {
		return builder.add_expr_value(null, value);
	}
}

function convert_datetime(datetime) {
	return datetime.to_utc().format('%Y-%m-%d %H:%M:%S');
}

// Unescape null values in sql since Gda.Null is not supported in gda 5
function unescape_sql(connection, builder) {
	const bstmt = builder.get_statement();
	const sql = connection.statement_to_sql(bstmt, bstmt.get_parameters()[1], null)[0];
	const unescapedSql = sql.replace(/(?<!')'NULL'(?!')/g, 'NULL');
	return connection.parse_sql_string(unescapedSql)[0];
}

function async_statement_execute_select(Gda, connection, statement, cancellable) {
	return new Promise((resolve, reject) => {
		if ('async_statement_execute' in connection) {
			// Gda 5
			const id = connection.async_statement_execute(
				statement,
				null,
				Gda.StatementModelUsage.RANDOM_ACCESS,
				null,
				false,
			);
			let i = 0;
			const timeoutId = GLib.timeout_add(GLib.PRIORITY_HIGH, 100, () => {
				try {
					const [result] = connection.async_fetch_result(id);
					if (result) {
						if (result instanceof Gda.DataModel) {
							resolve(result);
						} else {
							reject(new Error('Statement is not a selection statement'));
						}
						cancellable.disconnect(cancellableId);
						return GLib.SOURCE_REMOVE;
					}
					if (i >= 10) {
						reject(new Error('Timeout'));
						cancellable.disconnect(cancellableId);
						return GLib.SOURCE_REMOVE;
					}
					i++;
					cancellable.disconnect(cancellableId);
					return GLib.SOURCE_CONTINUE;
				} catch (error) {
					reject(error);
					cancellable.disconnect(cancellableId);
					return GLib.SOURCE_REMOVE;
				}
			});
			const cancellableId = cancellable.connect(() => GLib.source_remove(timeoutId));
		} else {
			// Gda 6
			GLib.idle_add(GLib.PRIORITY_HIGH, () => {
				try {
					const datamodel = connection.statement_execute_select(statement, null);
					resolve(datamodel);
				} catch (error) {
					reject(error);
				}
				return GLib.SOURCE_REMOVE;
			});
		}
	});
}

function async_statement_execute_non_select(Gda, connection, statement, cancellable) {
	return new Promise((resolve, reject) => {
		if ('async_statement_execute' in connection) {
			// Gda 5
			const id = connection.async_statement_execute(
				statement,
				null,
				Gda.StatementModelUsage.RANDOM_ACCESS,
				null,
				true,
			);
			let i = 0;
			const timeoutId = GLib.timeout_add(GLib.PRIORITY_HIGH, 100, () => {
				try {
					const [result, lastRow] = connection.async_fetch_result(id);
					if (result) {
						if (result instanceof Gda.Set) {
							const rows = result.get_holder_value('IMPACTED_ROWS');
							resolve([rows ?? -2, lastRow]);
						} else {
							reject(new Error('Statement is a selection statement'));
						}
						cancellable.disconnect(cancellableId);
						return GLib.SOURCE_REMOVE;
					}
					if (i >= 10) {
						reject(new Error('Timeout'));
						cancellable.disconnect(cancellableId);
						return GLib.SOURCE_REMOVE;
					}
					i++;
					cancellable.disconnect(cancellableId);
					return GLib.SOURCE_CONTINUE;
				} catch (error) {
					reject(error);
					cancellable.disconnect(cancellableId);
					return GLib.SOURCE_REMOVE;
				}
			});
			const cancellableId = cancellable.connect(() => GLib.source_remove(timeoutId));
		} else {
			// Gda 6
			GLib.idle_add(GLib.PRIORITY_HIGH, () => {
				try {
					const result = connection.statement_execute_non_select(statement, null);
					resolve(result);
				} catch (error) {
					reject(error);
				}
				return GLib.SOURCE_REMOVE;
			});
		}
	});
}

// Remove double backslashes since libgda's sqlite escaping is broken
function unescapeContent(content) {
	return content.replace(/\\\\/g, '\\');
}

/**
 * Database with Gda backend
 */
export class GdaDatabase {
	ext;
	_Gda;
	_connection;
	_cancellable = new Gio.Cancellable();

	constructor(ext, gda, file) {
		this.ext = ext;
		this._Gda = gda;
		let cncString;
		if (file) {
			const dir = file.get_parent() ?? getDataPath(ext);
			if (!dir.query_exists(null)) {
				dir.make_directory_with_parents(null);
			}
			const fileName = file.get_basename()?.replace(/\.db$/, '') ?? 'clipboard';
			cncString = `DB_DIR=${dir.get_path()};DB_NAME=${fileName}`;
		} else {
			cncString = 'DB_NAME=:memory:';
		}

		// Establish connection
		this._connection = new_connection(this._Gda, cncString);
	}

	async init() {
		await open_async(this._connection);
		this.ext.logger.info('Opened database connection');

		// Version table
		const [versionTableStmt] = this._connection.parse_sql_string(`
			CREATE TABLE IF NOT EXISTS 'clipboard_version' (
				'id'      integer PRIMARY KEY CHECK (id = 1),
				'version' integer
			)`);
		await async_statement_execute_non_select(this._Gda, this._connection, versionTableStmt, this._cancellable);

		// Get current schema version
		// SELECT (version) FROM 'clipboard_version'
		const builder1 = new this._Gda.SqlBuilder({ stmt_type: this._Gda.SqlStatementType.SELECT });
		builder1.select_add_target('clipboard_version', null);
		builder1.select_add_field('version', null, null);
		const versionStmt = builder1.get_statement();
		const versionResult = await async_statement_execute_select(
			this._Gda,
			this._connection,
			versionStmt,
			this._cancellable,
		);
		let version = 0;
		if (versionResult.get_n_rows() > 0) {
			// Get version
			const versionIter = versionResult.create_iter();
			versionIter.move_next();
			version = versionIter.get_value_for_field('version');
		} else {
			// Insert default version
			const [addVersionStmt] = this._connection.parse_sql_string(
				`INSERT OR IGNORE INTO clipboard_version (id, version) VALUES (1, 0)`,
			);
			await async_statement_execute_non_select(this._Gda, this._connection, addVersionStmt, this._cancellable);
		}

		// Run migrations based on version
		switch (version) {
			case 0: {
				// Create table
				const [stmt] = this._connection.parse_sql_string(`
					CREATE TABLE IF NOT EXISTS 'clipboard' (
						'id'       integer   NOT NULL UNIQUE PRIMARY KEY AUTOINCREMENT,
						'type'     text      NOT NULL,
						'content'  text      NOT NULL,
						'pinned'   boolean   NOT NULL,
						'tag'      text,
						'datetime' timestamp NOT NULL,
						'metadata' text,
						UNIQUE ('type', 'content')
					);
				`);
				await async_statement_execute_non_select(this._Gda, this._connection, stmt, this._cancellable);
			}

			/* falls through */
			case 1: {
				try {
					// Add title column
					const [addColumnStmt] = this._connection.parse_sql_string(
						`ALTER TABLE 'clipboard' ADD COLUMN 'title' text;`,
					);
					await async_statement_execute_non_select(
						this._Gda,
						this._connection,
						addColumnStmt,
						this._cancellable,
					);
				} catch {
					// Ignore
				}
			}
		}

		// Update to current version
		if (version !== DATABASE_VERSION) {
			// UPDATE 'version' SET version=DATABASE_VERSION
			const builder2 = new this._Gda.SqlBuilder({ stmt_type: this._Gda.SqlStatementType.UPDATE });
			builder2.set_table('clipboard_version');
			builder2.add_field_value_id(builder2.add_id('version'), add_expr_value(builder2, DATABASE_VERSION));
			const setVersionStmt = builder2.get_statement();
			await async_statement_execute_non_select(this._Gda, this._connection, setVersionStmt, this._cancellable);
			this.ext.logger.log(`Migrated database version from ${version} to ${DATABASE_VERSION}.`);
		}
	}

	async clear(history) {
		try {
			if (history === ClipboardHistory.KeepAll) {
				return [];
			}

			// SELECT id FROM table (WHERE NOT (pinned == true OR tag IS NOT NULL))?
			const [selectBuilder, where] = this.selectToDeleteBuilder(history === ClipboardHistory.KeepPinnedAndTagged);
			const selectStmt = selectBuilder.get_statement();
			const datamodel = await async_statement_execute_select(
				this._Gda,
				this._connection,
				selectStmt,
				this._cancellable,
			);
			const deleted = [];
			const iter = datamodel.create_iter();
			while (iter.move_next()) {
				deleted.push(iter.get_value_for_field('id'));
			}

			// Only delete if there are entries to delete
			if (deleted.length > 0) {
				// DELETE FROM table (WHERE ...)? RETURNING id;
				const deleteBuilder = new this._Gda.SqlBuilder({ stmt_type: this._Gda.SqlStatementType.DELETE });
				deleteBuilder.set_table('clipboard');
				if (where) {
					deleteBuilder.set_where(deleteBuilder.import_expression_from_builder(selectBuilder, where));
				}
				const deleteStmt = deleteBuilder.get_statement();
				await async_statement_execute_non_select(this._Gda, this._connection, deleteStmt, this._cancellable);
			}
			return deleted;
		} catch (e) {
			this.ext.logger.error('Failed to clear clipboard', e);
		}
		return [];
	}

	close() {
		this._connection.close();
		this._cancellable.cancel();
		return Promise.resolve();
	}

	async entries() {
		try {
			// SELECT * FROM clipboard
			const builder = new this._Gda.SqlBuilder({ stmt_type: this._Gda.SqlStatementType.SELECT });
			builder.select_add_target('clipboard', null);
			builder.select_add_field('id', null, null);
			builder.select_add_field('type', null, null);
			builder.select_add_field('content', null, null);
			builder.select_add_field('pinned', null, null);
			builder.select_add_field('tag', null, null);
			const datetimeId = builder.select_add_field('datetime', null, null);
			builder.select_add_field('metadata', null, null);
			builder.select_add_field('title', null, null);
			builder.select_order_by(datetimeId, false, null);
			const stmt = builder.get_statement();
			const dataModel = await async_statement_execute_select(
				this._Gda,
				this._connection,
				stmt,
				this._cancellable,
			);
			const entries = [];
			const iter = dataModel.create_iter();
			while (iter.move_next()) {
				const id = iter.get_value_for_field('id');
				const type = iter.get_value_for_field('type');
				const content = unescapeContent(iter.get_value_for_field('content'));
				const pinned = iter.get_value_for_field('pinned');
				const tag = iter.get_value_for_field('tag');
				let datetime = iter.get_value_for_field('datetime');
				const metadata = iter.get_value_for_field('metadata');
				const title = iter.get_value_for_field('title') ?? '';
				if ('Timestamp' in this._Gda && datetime instanceof this._Gda.Timestamp) {
					const timezone = GLib.TimeZone.new_offset(datetime.timezone);
					datetime = GLib.DateTime.new(
						timezone,
						datetime.year,
						datetime.month,
						datetime.day,
						datetime.hour,
						datetime.minute,
						datetime.second,
					);
				}
				let metadataObj = null;
				if (metadata) {
					try {
						const json = JSON.parse(metadata);
						if (json) {
							metadataObj = json;
						}
					} catch {
						this.ext.logger.error('Failed to parse metadata');
					}
				}
				entries.push(new ClipboardEntry(id, type, content, pinned, tag, datetime, metadataObj, title));
			}
			return entries;
		} catch (e) {
			this.ext.logger.error('Failed to get clipboard entries', e);
		}
		return [];
	}

	async selectConflict(entry) {
		try {
			// SELECT id FROM table WHERE type == entry.type AND content == entry.content LIMIT 1
			const builder = new this._Gda.SqlBuilder({ stmt_type: this._Gda.SqlStatementType.SELECT });
			builder.select_add_target('clipboard', null);
			builder.select_add_field('id', null, null);
			builder.set_where(
				builder.add_cond(
					this._Gda.SqlOperatorType.AND,
					builder.add_cond(
						this._Gda.SqlOperatorType.EQ,
						builder.add_id('type'),
						add_expr_value(builder, entry.type),
						0,
					),
					builder.add_cond(
						this._Gda.SqlOperatorType.EQ,
						builder.add_id('content'),
						add_expr_value(builder, entry.content),
						0,
					),
					0,
				),
			);
			builder.select_set_limit(add_expr_value(builder, 1), add_expr_value(builder, 0));

			// Get id
			const stmt = builder.get_statement();
			const datamodel = await async_statement_execute_select(
				this._Gda,
				this._connection,
				stmt,
				this._cancellable,
			);
			const iter = datamodel.create_iter();
			if (iter.move_next()) {
				return iter.get_value_for_field('id');
			}
			return null;
		} catch (e) {
			this.ext.logger.error('Failed to select conflicting entry', e);
		}
		return null;
	}

	/// Note: content will be inserted incorrectly into the database since libgda escapes sqlite incorrectly
	async insert(type, content, metadata = null) {
		try {
			// INSERT INTO table (type, content, pinned, tag, datetime, metadata)
			// VALUES (entry.type, entry.content, entry.pinned, entry.tag, entry.datetime, entry.metadata)
			const builder = new this._Gda.SqlBuilder({
				stmt_type: this._Gda.SqlStatementType.INSERT,
			});
			builder.set_table('clipboard');
			builder.add_field_value_as_gvalue('type', type);

			// NOTE: content will be inserted incorrectly
			builder.add_field_value_as_gvalue('content', content);
			builder.add_field_value_as_gvalue('pinned', false);
			const datetime = GLib.DateTime.new_now_utc();
			builder.add_field_value_as_gvalue('datetime', convert_datetime(datetime));
			if (metadata) builder.add_field_value_as_gvalue('metadata', JSON.stringify(metadata));

			// Execute
			const stmt = builder.get_statement();
			const [, row] = await async_statement_execute_non_select(
				this._Gda,
				this._connection,
				stmt,
				this._cancellable,
			);
			const id = row?.get_nth_holder(0).get_value();
			if (id == null) return null;
			return new ClipboardEntry(id, type, content, false, null, datetime, metadata);
		} catch (e) {
			this.ext.logger.error('Failed to insert entry', e);
		}
		return null;
	}

	async updateProperty(entry, property) {
		try {
			let value = entry[property] ?? 'NULL';
			if (property === 'metadata') value = JSON.stringify(entry['metadata']);
			else if (property === 'datetime') value = convert_datetime(entry['datetime']);

			// UPDATE table
			// SET property = entry.property
			// WHERE id == entry.id
			const builder = new this._Gda.SqlBuilder({
				stmt_type: this._Gda.SqlStatementType.UPDATE,
			});
			builder.set_table('clipboard');
			builder.add_field_value_as_gvalue(property, value);
			builder.set_where(
				builder.add_cond(
					this._Gda.SqlOperatorType.EQ,
					builder.add_id('id'),
					add_expr_value(builder, entry.id),
					0,
				),
			);

			// Escape the null value since the bindings for Gda5 do not support Gda.Null
			const stmt = unescape_sql(this._connection, builder);
			const [rows] = await async_statement_execute_non_select(
				this._Gda,
				this._connection,
				stmt,
				this._cancellable,
			);
			if (rows !== -1 || (property !== 'type' && property !== 'content')) {
				return -1; // success
			}

			// Return the id of the conflicting entry
			const id = await this.selectConflict(entry);
			return id ?? -1;
		} catch (e) {
			this.ext.logger.error(`Failed to update property "${property}" for entry ${entry.id}`, e);
		}
		return -1;
	}

	async delete(entry) {
		try {
			// DELETE FROM table WHERE id == entry.id
			const builder = new this._Gda.SqlBuilder({
				stmt_type: this._Gda.SqlStatementType.DELETE,
			});
			builder.set_table('clipboard');
			builder.set_where(
				builder.add_cond(
					this._Gda.SqlOperatorType.EQ,
					builder.add_id('id'),
					add_expr_value(builder, entry.id),
					0,
				),
			);
			const stmt = builder.get_statement();
			const [result] = await async_statement_execute_non_select(
				this._Gda,
				this._connection,
				stmt,
				this._cancellable,
			);
			return result > 0;
		} catch (e) {
			this.ext.logger.error(`Failed to delete entry ${entry.id}`, e);
		}
		return false;
	}

	async deleteOldest(offset, olderThanMinutes) {
		try {
			// WITH select1 AS (...) (SELECT id FROM select1) UNION (select2)
			const selectBuilder = new this._Gda.SqlBuilder({
				stmt_type: this._Gda.SqlStatementType.COMPOUND,
			});
			selectBuilder.compound_set_type(this._Gda.SqlStatementCompoundType.UNION);

			// SELECT id FROM table WHERE NOT (pinned == true OR tag IS NOT NULL) ORDER BY datetime LIMIT -1 OFFSET offset
			const [select1Builder] = this.selectToDeleteBuilder();
			select1Builder.select_order_by(select1Builder.add_id('datetime'), false, null);
			select1Builder.select_set_limit(add_expr_value(select1Builder, -1), add_expr_value(select1Builder, offset));

			// SELECT id FROM table WHERE NOT (pinned == true OR tag IS NOT NULL) AND datetime < DATETIME('now', '-n minutes')
			let selectStmt;
			if (olderThanMinutes > 0) {
				// Workaround for ORDER BY not working inside compound selector and add_subselect not being exposed in Gda 5.0
				const workAroundBuilder = new this._Gda.SqlBuilder({ stmt_type: this._Gda.SqlStatementType.SELECT });
				workAroundBuilder.select_add_field('id', null, null);
				workAroundBuilder.select_add_target('select1', null);
				selectBuilder.compound_add_sub_select_from_builder(workAroundBuilder);
				const [select2Builder] = this.selectToDeleteBuilder(true, olderThanMinutes);
				selectBuilder.compound_add_sub_select_from_builder(select2Builder);

				// SELECT id FROM (SELECT id FROM table WHERE ...)
				const select1Sql = this._connection.statement_to_sql(select1Builder.get_statement(), null, null)[0];
				const selectSql = this._connection.statement_to_sql(selectBuilder.get_statement(), null, null)[0];
				selectStmt = this._connection.parse_sql_string(selectSql.replace('select1', `(${select1Sql})`))[0];
			} else {
				// Ignore compound selector
				selectStmt = select1Builder.get_statement();
			}

			// Run select
			const datamodel = await async_statement_execute_select(
				this._Gda,
				this._connection,
				selectStmt,
				this._cancellable,
			);

			// DELETE FROM table WHERE id IN (select)
			// add_subselect is not exposed as a javascript binding in Gda 5.0
			const selectSql = this._connection.statement_to_sql(selectStmt, selectStmt.get_parameters()[1], null)[0];
			const [deleteStmt] = this._connection.parse_sql_string(`DELETE FROM clipboard WHERE id IN (${selectSql})`);
			const [rows] = await async_statement_execute_non_select(
				this._Gda,
				this._connection,
				deleteStmt,
				this._cancellable,
			);

			// Get ids
			const deleted = [];
			if (rows > 0) {
				const iter = datamodel.create_iter();
				while (iter.move_next()) {
					deleted.push(iter.get_value_for_field('id'));
				}
			}
			return deleted;
		} catch (e) {
			this.ext.logger.error('Failed to delete oldest entries', e);
		}
		return [];
	}

	selectToDeleteBuilder(includeWhere = true, olderThanMinutes = 0) {
		// SELECT id FROM table (WHERE NOT (pinned == true OR tag IS NOT NULL) (AND datetime < DATETIME('now', '-n minutes'))?)?
		const builder = new this._Gda.SqlBuilder({
			stmt_type: this._Gda.SqlStatementType.SELECT,
		});
		builder.select_add_field('id', null, null);
		builder.select_add_target('clipboard', null);
		let where = null;
		if (includeWhere) {
			// WHERE NOT (pinned == true OR tag IS NOT NULL)
			where = builder.add_cond(
				this._Gda.SqlOperatorType.NOT,
				builder.add_cond(
					this._Gda.SqlOperatorType.OR,
					builder.add_cond(
						this._Gda.SqlOperatorType.EQ,
						builder.add_id('pinned'),
						add_expr_value(builder, true),
						0,
					),
					builder.add_cond(this._Gda.SqlOperatorType.ISNOTNULL, builder.add_id('tag'), 0, 0),
					0,
				),
				0,
				0,
			);

			// AND datetime < DATETIME('now', '-n minutes')
			if (olderThanMinutes > 0) {
				where = builder.add_cond(
					this._Gda.SqlOperatorType.AND,
					where,
					builder.add_cond(
						this._Gda.SqlOperatorType.LT,
						builder.add_id('datetime'),
						builder.add_function('DATETIME', [
							add_expr_value(builder, 'now'),
							add_expr_value(builder, `-${olderThanMinutes} minutes`),
						]),
						0,
					),
					0,
				);
			}
			builder.set_where(where);
		}
		return [builder, where];
	}
}
