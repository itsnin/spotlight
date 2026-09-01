import GObject from 'gi://GObject';

var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r = c < 3 ? target : desc === null ? (desc = Object.getOwnPropertyDescriptor(target, key)) : desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i])) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return (c > 3 && r && Object.defineProperty(target, key, r), r);
	};

/**
 * GObject.registerClass wrapper for use with decorators
 */
export function registerClass(options) {
	if (options) {
		return (cls) => GObject.registerClass(options, cls);
	} else {
		return (cls) => GObject.registerClass(cls);
	}
}

let JsObjectWrapper = class JsObjectWrapper extends GObject.Object {
	jsobject;

	constructor(jsobject) {
		super();
		this.jsobject = jsobject;
	}
};
JsObjectWrapper = __decorate(
	[
		registerClass({
			Properties: {
				jsobject: GObject.ParamSpec.jsobject('jsobject', null, null, GObject.ParamFlags.READABLE),
			},
		}),
	],
	JsObjectWrapper,
);

export { JsObjectWrapper };

export function int32ParamSpec(name, flags, defaultValue) {
	return GObject.ParamSpec.int(name, null, null, flags, 0, 2147483647, defaultValue);
}

export function enumParamSpec(name, flags, e, defaultValue) {
	const values = Object.values(e)
		.map((k) => +k)
		.filter((k) => Number.isInteger(k));
	const min = Math.min(...values);
	const max = Math.max(...values);
	return GObject.ParamSpec.int(name, null, null, flags, min, max, defaultValue);
}

export function flagsParamSpec(name, flags, e, defaultValue) {
	const values = Object.values(e)
		.map((k) => +k)
		.filter((k) => Number.isInteger(k));
	const max = (2 << Math.log2(Math.floor(Math.max(...values)))) - 1;
	return GObject.ParamSpec.int(name, null, null, flags, 0, max, defaultValue);
}
