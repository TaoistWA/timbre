/**
 * timbre/record
 */
"use strict";

var timbre = require("../timbre");
// __BEGIN__

var Record = (function() {
    var Record = function() {
        initialize.apply(this, arguments);
    }, $this = Record.prototype;
    
    timbre.fn.setPrototypeOf.call($this, "ar-only");

    Object.defineProperty($this, "buffer", {
        get: function() { return this._.buffer; }
    });
    Object.defineProperty($this, "recTime", {
        set: function(value) {
            var _ = this._;
            if (typeof value === "number" && value > 0) {
                _.recTime = value;
                // _.buffer = new Float32Array((timbre.samplerate * _.recTime / 1000)|0);
            }
        },
        get: function() { return this._.recTime; }
    });
    Object.defineProperty($this, "currentTime", {
        get: function() { return this._.index / timbre.samplerate * 1000; }
    });
    
    var initialize = function(_args) {
        var i, _;
        
        this._ = _ = {};
        
        i = 0;
        if (typeof _args[i] === "number" && _args[i] > 0) {
            _.recTime = _args[i++];
        } else {
            _.recTime = 1000;
        }
        if (typeof _args[i] === "function") {
            _.onrecorded = _args[i++];
        }
        this.args = timbre.fn.valist.call(this, _args.slice(i));

        _.buffer = new Float32Array((timbre.samplerate * _.recTime / 1000)|0);
        _.index  = _.currentTime = 0;
        _.ison   = true;
    };
    
    $this.on = function() {
        if (!this._.ison) {
            this._.ison = true;
            timbre.fn.do_event(this, "on");
        }
        return this;
    };
    $this.off = function() {
        if (this._.ison) {
            this._.ison = false;
            onrecorded.call(this);
            timbre.fn.do_event(this, "off");
        }
        return this;
    };
    $this.bang = function() {
        var buffer, i, _ = this._;
        _.index = _.currentTime = 0;
        buffer = _.buffer;
        for (i = _.buffer.length; i--; ) {
            buffer[i] = 0.0;
        }
        timbre.fn.do_event(this, "bang");
        return this;
    };
    
    var onrecorded = function() {
        var _ = this._;
        if (_.onrecorded) {
            _.onrecorded.call(this, {
                buffer:_.buffer.subarray(0, _.index)
            });
        }
    };
    
    $this.seq = function(seq_id) {
        var _ = this._;
        var args, cell;
        var buffer, index;
        var mul, add;
        var tmp, i, imax, j, jmax;
        
        cell = this.cell;
        if (seq_id !== this.seq_id) {
            args = this.args.slice(0);
            buffer = _.buffer;
            index  = _.index;
            mul  = _.mul;
            add  = _.add;
            jmax = timbre.cellsize;
            for (j = jmax; j--; ) {
                cell[j] = 0;
            }
            for (i = 0, imax = args.length; i < imax; ++i) {
                if (args[i].seq_id === seq_id) {
                    tmp = args[i].cell;
                } else {
                    tmp = args[i].seq(seq_id);
                }
                for (j = jmax; j--; ) {
                    cell[j] += tmp[j];
                }
            }
            if (_.ison) {
                for (j = 0; j < jmax; ++j) {
                    buffer[index++] = cell[j];
                    cell[j] = cell[j] * mul + add;
                }
                if (index >= buffer.length) {
                    _.ison = false;
                    onrecorded.call(this);
                    timbre.fn.do_event(this, "ended");
                }
                _.index = index;
            } else {
                for (j = jmax; j--; ) {
                    cell[j] = cell[j] * mul + add;
                }
            }
            this.seq_id = seq_id;
        }
        return cell;
    };
    
    return Record;
}());
timbre.fn.register("rec", Record);

// __END__

describe("rec", function() {
    object_test(Record, "rec");
});