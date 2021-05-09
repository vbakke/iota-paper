
class Logo {
    /**
     * Constructor
     * @param {*} src 
     * @param {*} canvas 
     * @param {*} x 
     * @param {*} y 
     * @param {*} scale 
     */
    constructor(src, canvas, x, y, scale) {
        this.image = new Image();
        this.image.src = src;

        this.canvas = canvas;
        this.context = this.canvas.getContext("2d");


        this.centerX = (typeof x === 'undefined') ? this.canvas.width / 2 : x;
        this.centerY = (typeof y === 'undefined') ? this.canvas.height / 2 : y;

        this.scale = scale;
        var _self = this;
        this.onloadFuncs = [
            function () {
                _self.scale = _self.scale || Math.min(_self.canvas.width / _self.image.width);
                _self.draw();
            }

        ];
        this.image.onload = function () {
            _self.onloadFuncs.forEach(function (func) {
                func();
            });
        };

    }

    /**
     * 
     * @param {*} func 
     */
    onload(func) {
        this.onloadFuncs.push(func);
    }

    /**
     * 
     * @param {*} angleInRadians 
     */
    draw(angleInRadians) {
        angleInRadians = angleInRadians || 0;
        //console.log('Rotate:',angleInRadians);

        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.translate(this.centerX, this.centerY);
        this.context.rotate(angleInRadians);
        this.context.drawImage(this.image, -this.image.width * this.scale / 2, -this.image.height * this.scale / 2, this.image.width * this.scale, this.image.height * this.scale);
        this.context.rotate(-angleInRadians);
        this.context.translate(-this.centerX, -this.centerY);
    }

    /**
     * Spin once around
     * 
     * @param {*} duration 
     */
    spin(duration) {
        duration = duration || 1000;
        var _self = this;
        if (!_self._isSpinning) {
            _self._isSpinning = true;

            var id = setInterval(frameFunc, 10);
            var start = Date.now();
            consol.log('frame starts');
            function frameFunc() {
                consol.log('frame');
                var t = Date.now() - start;
                if (t > duration) {
                    clearInterval(id);
                    _self.draw();
                    _self._isSpinning = false;
                } else {
                    _self.draw(t / duration * 2 * Math.PI);
                }
            }
        }
    }
    
    spinStart(oneLapDuration, onDone) {
        var _self = this;
        oneLapDuration = oneLapDuration || 1000;
        
        // Initialize spinning
        this._spinningState = -2;
        var start = Date.now();
        var id = setInterval(frameFunc, 10);
        console.log(performance.now().toFixed(1)+' ms: Started spinning');
        // Ths spinning function
        function frameFunc() {
            var t = Date.now() - start;
            var rounds = t/oneLapDuration;
            console.log(performance.now().toFixed(1)+' ms: frame',t, rounds);
            if (_self._spinningState == -2) {
                // Keep spinning
                _self.draw(rounds * 2 * Math.PI);
                
            } else if (_self._spinningState == -1) {
                // Stop signal. 
                // Save max rounds
                _self._spinningState = Math.floor(rounds) + 1;
                _self.draw(rounds * 2 * Math.PI);
                
                
            } else if (_self._spinningState > 0) {
                // Is stopping, continue untill full turn is reached
                if (rounds < _self._spinningState) {
                    _self.draw(rounds * 2 * Math.PI);
                } else {
                    // Final spin is done
                    console.log(performance.now().toFixed(1)+' ms: Stopped spinning');
                    clearInterval(id);    
                    _self._spinningState = 0;
                    _self.draw();
                    onDone && onDone(rounds);
                }
            }
        }
    }
    
    spinStop() {
        console.log(performance.now().toFixed(1)+' ms: Stops spinning');
        this._spinningState = -1;
    }

    isSpinning() {
        return (this._spinningState && this._spinningState != 0) ;
    }
}

module.exports = Logo;  