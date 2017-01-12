function close(a,b,precision){
    precision = precision !== undefined ? precision : 0.01;
    return Math.abs(a-b) < precision;
}

this.suite1 = {

    construct: function (test) {
        cartridge({
            containerId: "container"
        });
        test.done();
    },

    math: {
        sin: function(test){
            test.ok(close(sin(0),0));
            test.ok(close(sin(0.5),0));
            test.ok(close(sin(1),0));
            test.done();
        },
        cos: function(test){
            test.ok(close(cos(0),1));
            test.ok(close(cos(0.5),-1));
            test.ok(close(cos(1),1));
            test.done();
        },
        atan2: function(test){
            test.ok(close(0.125, atan2(1,1)));
            test.done();
        },
        flr: function(test){
            test.equal(flr(1.5), 1);
            test.done();
        },
        ceil: function(test){
            test.equal(ceil(1.5), 2);
            test.done();
        },
        rnd: function(test){
            test.ok(rnd(2)>=0);
            test.ok(rnd(2)<=2);
            test.done();
        },
        abs: function(test){
            test.equal(abs(-1.2), 1.2);
            test.equal(abs(1.2), 1.2);
            test.done();
        },
        max: function(test){
            test.equal(max(1,2), 2);
            test.done();
        },
        min: function(test){
            test.equal(min(1,2), 1);
            test.done();
        },
        nan: function(test){
            test.ok(nan(NaN));
            test.ok(!nan(1));
            test.done();
        },
        inf: function(test){
            test.equal(inf, Infinity);
            test.done();
        },
        mix: function(test){
            test.equal(mix(1,2,0.5), 1.5);
            test.done();
        },
        sgn: function(test){
            test.equal(sgn(2), 1);
            test.equal(sgn(-2), -1);
            test.equal(sgn(0), 0);
            test.done();
        },
        sqrt: function(test){
            test.equal(sqrt(1), 1);
            test.done();
        },
        mid: function(test){
            test.equal(mid(1,2,3), 2);
            test.equal(mid(1,1,1), 1);
            test.done();
        },
        clamp: function(test){
            test.equal(clamp(1.5,0,1), 1);
            test.equal(clamp(-1.5,0,1), 0);
            test.done();
        }
    },

    mouse: {
        mousex: function (test) {
            test.equal(mousex(), 0);
            test.done();
        },
        mousey: function (test) {
            test.equal(mousey(), 0);
            test.done();
        }
    },

    misc: {
        assert: function(test){
            assert(true);
            assert(1);
            test.done();
        },
        fit: function (test) {
            fit(0);
            fit(1);
            test.done();
        },
        print: function (test) {
            print("abc");
            test.done();
        },
        log: function (test) {
            log("abc");
            test.done();
        },
        def: function (test) {
            test.ok(def("abc"));
            test.ok(def(3));
            test.ok(!def(undefined));
            test.done();
        }
    },

    spritesheet: {
        sset: function(test){
            sset(0,0,1);
            test.done();
        },
        sget: function(test){
            test.equal(typeof sget(0,0), 'number');
            test.done();
        },
        fset: function(test){
            fset(0,1+2+4);
            test.equal(fget(0), 1+2+4);

            fset(0,0);
            fset(0,3,true);
            test.equal(fget(0), 8);

            test.done();
        },
        fget: function(test){
            test.equal(typeof fget(0), 'number');
            test.equal(typeof fget(0,1), 'boolean');
            test.done();
        }
    },

    pixelops: {
        pset: function(test){
            pset(0,0,1);
            test.done();
        },
        pget: function(test){
            test.equal(typeof pget(0,0), 'number');
            test.done();
        }
    },

    save: {
        localStorage: function(test){
            save('myGame');
            test.ok(JSON.parse(localStorage.getItem('myGame')));
            test.done();
        }
    },

    load: {
        localStorage: function(test){
            save('myGame');
            load('myGame');
            test.done();
        }
    },

    map: {
        mset: function(test){
            mset(0,0,1);
            test.equal(mget(0,0),1);
            test.done();
        },
        mget: function(test){
            mset(0,0,1);
            test.equal(mget(0,0),1);
            test.done();
        }
    },

    palette: {
        palset: function(test){
            palset(0,0);
            test.equal(palget(0),0);
            palset(100,0); // set out of range
            test.equal(palget(100),0);
            test.equal(palget(101),undefined);
            test.done();
        },
        palget: function(test){
            palset(0,0);
            test.equal(palget(0),0);

            palset(1,0xff0000);
            test.equal(palget(1),0xff0000);

            // truncate
            sset(64,64,2);
            palset(2,-1);
            test.equal(palget(2),undefined);
            test.equal(palget(1),0xff0000);
            test.equal(palget(0),0);
            test.equal(sget(64,64),0);

            test.done();
        },
    },
};