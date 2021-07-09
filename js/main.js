var $ = require('jquery');
const vault = require('iota-paper-encryption');
var qrcode = require('qrcode');
var jsQR = require('jsqr');
var Logo = require('./logo.js');
const iota = require('./iota.js');
const { decodeSeedToBytes, encodeByteSeed } = require('iota-paper-encryption');


const qrColor = '#1f3a70';

let default_layout = 'plain';
const wallets = {
    plain: {
        size: {}, // To-be-implemented
        scale: 2, 
        background: {
            file: './assets/template-chrysalis.png',
            // size: {width: 900, height: 450},
            // file: './assets/iota-chrysalis.png',
            // size: {width: 865/484*80, height: 80},
        },
        qrAddr: {}, // To-be-implemented
        qrSeed: {}, // To-be-implemented
        txtAddr: {}, // To-be-implemented
        txtSeed: {}, // To-be-implemented
    },
};


const tangleUrl = 'https://explorer.iota.org/mainnet/addr/';

//var initalSeed = 'BAD0005EED000102030405060708090A0B0C0D0E0F10111213141516171819FF';
// const _cachedAddresses = { '07Y5F5PDJ3MDE3WZQ0F9F17SDWTV986RFN9K5FVAED0W7E8VGSN7C0820C20A1G713WDQNHX': 'iota1qplh5m5tw4cy0rd2ys8qtjcgz9zfg7lw54590ksw7wjhgkyl07mcjtdpcsw' };
// const _cachedAddresses = { '07SSXYHZDTBVZQM5GZNBPGCT0FPH2JHM3KG6AEXHG82FB5DASTS19RMZYQXTKRF34HW8FJJ1': 'iota1qr54g94z8tqayhg6xr6q5w556ham22c6ealzd4kelmr5jjyejsfryecuwq9' };  // abuse
const _cachedAddresses = { '04NCP9RGJ1TFAJC522T9S7EA05WHEK7FQW4MV9HPC49KDX8A2Z96PV6SPHY1FJ0R3DFZ3A18': 'iota1qr6mx6fmzjwgpq8k9s7x06e6duxp6kpdqp5gjzyc3z6af5a5gcse7jcvymm' };  // cool burger

var initalSeed = Object.keys(_cachedAddresses)[0];
let googleLog = false;

$(function () {
    if (googleLog) {
        $('#warning').addClass('warning').html('&#9888; Do not scan or enter actual seeds unless you are offline in a safe environment! &#9888;'
            + '<br/> You never know who is peeking.');
    }
    
    var logo = new Logo('assets/iota-logo-100.png', $('canvas.logo')[0]);
    var $wallet = $('.wallet');
    var $walletImg = $wallet.find('.wallet-img');
    var layout = wallets[default_layout];
    displaySeed($('.article'), initalSeed, true);
    clearProgress();
    $walletImg.attr('src', layout.background.file);
    $walletImg.on('load', (e) => {
        drawBackground($wallet, layout);
    });

    
    // Event handlers
    $('textarea.passphrase').on('change input paste', function (e) {
        let text = $(e.target).val();
        let blurred =  !(text === 'Ƥāssφräsę');
         $(e.target).toggleClass('blurred', blurred);        
    });


    $('textarea.seed').on('change input paste', function (e) {
        let text = $(e.target).val();
        displaySeed($(e.target).closest('.article'), text);
    });

    $('button.show-algorithm').on('click', function (e) {
        var action = ($('.progress:visible').length) ? 'hide' : 'show';
        if (googleLog && ga) ga('send', 'event', 'tryte-encrypt', 'show-algorithm', action);

        $('.progress').toggle();
    });

    $('button.scan-seed').on('click', function (e) {
        if (googleLog && ga) ga('send', 'event', 'tryte-encrypt', 'scanSeed');
        var $button = $(e.target);
        var $article = $button.closest('.article');
        if ($button.data('type') === 'CANCEL') {
            $('#statusMessage').text("Cancelling video...");
            $button.data('type', 'CANCELING');
        } else {
            $('#statusMessage').text("⌛ Loading video...");
            $button.data('type', 'CANCEL');
            $button.text('Cancel');
            //----------------------
            // SetUp webcam - START
            var video = document.createElement('video');
            var canvas = $(e.target).closest('.article').find('canvas.camfeed')[0];
            var context = canvas.getContext("2d");
            context.scale(-1, 1);


            // Use facingMode: environment to attemt to get the front camera on phones
            var localStream;
            navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then(function (stream) {
                video.srcObject = stream;
                video.setAttribute("playsinline", true); // required to tell iOS safari we don't want fullscreen
                video.play();
                localStream = stream;
                requestAnimationFrame(tick);
                $('#statusMessage').text("Hold a QR code infront of the webcamera to scan the seed");

            });
            // SetUp webcam - END
            //----------------------

            function tick() {
                //console.log('tick');
                var keepScanning = true;
                if (video.readyState === video.HAVE_ENOUGH_DATA) {
                    //console.log('tack');

                    //loadingMessage.hidden = true;
                    canvas.hidden = false;
                    //outputContainer.hidden = false;
                    // canvas.height = video.videoHeight;
                    // canvas.width = video.videoWidth;
                    canvas.height = 120;
                    canvas.width = 120;
                    context.drawImage(video, 0, 0, canvas.width, canvas.height);

                    var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                    var code = jsQR(imageData.data, imageData.width, imageData.height);

                    //if ($button.data('type') == 'CANCELING') {
                    // STOP VIDEO
                    if ($button.data('type') == 'CANCELING') {
                        //console.log('Stops scanning, canceled');
                        if (googleLog && ga) ga('send', 'event', 'tryte-encrypt', 'cancelScanning');
                        $button.data('type', 'SCAN');
                        $button.text('Scan');
                        canvas.hidden = true;
                        displaySeed($('.article'));
                        keepScanning = false;
                    } else if (code && code.data) {
                        /*
                        var addressIncCRC = addChecksum(code.data);
                        if (addressIncCRC) {
                          console.log('Added checksum: ', addressIncCRC);
                          code.data = addressIncCRC;
                        }
                        */

                        var seed = parseSeed(code.data);
                        if (seed.type == 'PLAIN' || seed.type == 'ENCRYPTED' || seed.type == 'ADDRESS') {
                            if (googleLog && ga) ga('send', 'event', 'tryte-encrypt', 'scanedSeed', seed.type);
                            $button.data('type', 'SCAN');
                            $button.text('Scan');
                            $('#statusMessage').text('');
                            drawRect(context, code.location, "#FF3B58");
                            keepScanning = false;
                            setTimeout(() => {
                                //console.log('SEED');
                                canvas.hidden = true;
                                displaySeed($article, seed, true);
                            }, 700);
                            //console.log('Stops scanning, found seed');
                        }
                    }
                }



                if (keepScanning) {
                    requestAnimationFrame(tick);
                } else {
                    localStream.getTracks().forEach(track => track.stop());
                    video.pause();
                    video.src = "";
                    setTimeout(() => {
                        console.log('Clear Cancel msg')
                        $('#statusMessage').text("");
                    }, 500);

                }
            }
        }
    });

    $('button.generate-seed').on('click', function (e) {
        if (googleLog && ga) ga('send', 'event', 'tryte-encrypt', 'generateSeed');
        displaySeed($(e.target).closest('.article'), generateSeed(), true);
        $('button.encrypt-seed').data('type', 'ENCRYPT');
        $('button.encrypt-seed').trigger('click');
    });

    $('button.encrypt-seed').on('click', function (e) {
        var $button = $(e.target);
        var $article = $button.closest('.article');
        var seed = $article.find('textarea.seed').val();
        var passphrase = $article.find('textarea.passphrase').val().trim();
        if (passphrase === '') {
            $('#statusMessage').text('Cannot encrypt or decrypt without a passphrase');
            return;
        }


        var toughness = parseInt($article.find('select.scrypt-T').val());
        var hashoptions = { toughness: toughness, interruptStep: 3000 };

        drawQr($('.wallet-canvas'), '', 'L', { x: -1, y: 63 });
        $('.logo').removeClass('hidden');
        $('canvas.logo').removeClass('spinner');
        $('canvas.logo').addClass('spinner');
        var seedTranformed;

        var decrypt = $button.data('type') == 'DECRYPT';
        $('#statusMessage').text(decrypt ? 'Decrypting...' : 'Encrypting...');
        clearProgress();
        displayModeElements((decrypt) ? 'decrypt' : 'encrypt');
        setTimeout(async function () {
            if (decrypt) {
                if (googleLog && ga) {
                    let toughness = seed.substr(seed.indexOf(':'));
                    toughness = (toughness[0] == ':') ? toughness.substr(1) : '';
                    ga('send', 'event', 'tryte-encrypt', 'decryptSeed', toughness);
                }
                $('#statusMessage').text('');
                try {
                    let decrypted = await vault.decryptSeed(seed, passphrase);
                    seedTranformed = decrypted;
                    displaySeed($article, decrypted, true);
                } catch {
                    $('#statusMessage').text('Incorrect passphrase');
                }
                $('canvas.logo').removeClass('spinner')

            } else {
                if (googleLog && ga) ga('send', 'event', 'tryte-encrypt', 'encryptSeed', 'T' + toughness);
                let OVERRIDE_SALT = undefined; //[1, 2, 3, 4, 5, 6, 7, 8];
                if (OVERRIDE_SALT) console.warn('DEBUG: Overrriding random SALT with', OVERRIDE_SALT);
                let encrypted = await vault.encryptSeed(seed, passphrase, hashoptions.toughness, OVERRIDE_SALT);
                if (_cachedAddresses[seed]) {
                    address = _cachedAddresses[seed];
                    delete _cachedAddresses[seed];
                    _cachedAddresses[encrypted] = address;
                }

                $('#statusMessage').text('');
                displaySeed($article, encrypted, true);
                seedTranformed = encrypted;
                $('canvas.logo').removeClass('spinner')
            }
        }, 10);
    });

    // View functions
    function startSpinner() {

    }
    function stopSpinner() {

    }
    function showProgress(mode) {
        $('.progress').show();
    }
    function hideProgress() {
        $('.progress').hide();
    }

    var progressArray = [];
    function clearProgress() {
        progressArray = [];
        var $progress = $('#progress');
        $progress.find('.timing').text('');
        $progress.find('.value').text('');
        $progress.find('.length').text('');
        displayModeElements('encrypt');
    }
    function onProgress(progress) {
        progress.timestamp = Date.now();
        progress.duration = (progressArray.length == 0) ? 0 : Math.max(1, progress.timestamp - progressArray[progressArray.length - 1].timestamp);
        progressArray.push(progress);
        displayProgress(progress);
    }

    function displayProgress(progress) {
        //console.log('Progress:', progress.stage, progress);
        var $progress = $('#progress');
        // Display step info
        var $div = $progress.find('#step' + progress.stage);
        if ($div.length) {
            $div.find('.timing').text(progress.duration + ' ms');
        }
        // Display stage info
        var $div = $progress.find('#stage' + progress.stage);
        if ($div.length) {
            var content = parseStageContent(progress.value);
            $div.find('.value').text(content.value);
            $div.find('.length').text(content.length);
        }
        if (progress.stage == 'T') {
            $progress.find('#stepP2 .explanation').text('Parameters: logN: ' + progress.value.logN + ', p: ' + progress.value.p + ', r: ' + progress.value.r);
        }
    }
    function parseStageContent(content) {
        var parsed = {};
        if (typeof content === 'string') {
            parsed.length = content.length + ' chars';
            parsed.value = content;
        } else {
            var bytes = [];
            for (let i = 0; i < content.length; i++) {
                bytes.push(parseInt(content[i]));
            }
            parsed.length = bytes.length + ' bytes, ' + bytes.length * 8 + ' bits';
            parsed.value = bytes.join(', ');

        }
        return parsed;
    }

    function displayModeElements(mode) {
        var $elements = $('.mode-element');

        $('.mode-element').filter('[data-mode="' + mode + '"]').show();
        $('.mode-element').not('[data-mode="' + mode + '"]').hide();

    }

    function displaySeed(e, seed, updateInputField) {
        if (!seed) {
            seed = $(e).find('textarea.seed').val();
        }
        if (typeof seed == 'string') {
            seed = parseSeed(seed);
        }

        if (updateInputField) {
            $input = $(e).find('textarea.seed');
            if ($input.length) {
                $input.val(seed.value);
            }
        }

        displayWallet(e, seed);
    }

    function displayWallet(e, seed) {

        let $select = $(e).find('.scrypt-T');
        if (seed.type == 'ADDRESS' || seed.type == 'bip39') {
            // pass
        } else if (seed.type == 'ENCRYPTED') {
            let opts = seed.value.split(':')[1] || '0';
            if (opts[0] == 'T') opts = opts.slice(1);
            if ($select.children("[value='" + opts + "']").length) {
                $select.val(opts);
            } else {
                $select.children(':first').val(opts).text(opts);
            }
        } else {
            $select.val("0");
        }



        let $seedTitle = $(e).find('.seed-title');
        var $butEncrypt = $(e).find('button.encrypt-seed');
        var emptyPassphrase = ($(e).find('textarea.passphrase').val().trim() == '');
        var seedValue = null;
        var address = null;
        var seedTitle = "";
        var addressTitle = 'DEPOSIT';
        if (seed.type == 'ADDRESS') {
            $('.logo').addClass('hidden');
            $seedTitle.text('Address');
            $butEncrypt.text('Encrypt');
            $butEncrypt.data('type', 'DECRYPT');
            $butEncrypt.attr('disabled', 'disabled');
            addressTitle = 'ADDRESS';
            address = seed.value;
        }
        else if (seed.type == 'ENCRYPTED') {
            $('.logo').addClass('hidden');
            $seedTitle.text('Encrypted seed');
            $butEncrypt.text('Decrypt');
            $butEncrypt.data('type', 'DECRYPT');
            $butEncrypt.prop('disabled', emptyPassphrase);
            address = (_cachedAddresses[seed.value]) ? _cachedAddresses[seed.value] : "";
            seedTitle = 'ENCRYPTED';
            seedValue = seed.value;
        } else if (vault.VALID_ENCODINGS.includes(seed.type)) {
            $('.logo').removeClass('hidden');
            $seedTitle.text('Seed: ' + seed.type);
            $butEncrypt.text('Encrypt');
            $butEncrypt.data('type', 'ENCRYPT');
            $butEncrypt.prop('disabled', emptyPassphrase);
            if (_cachedAddresses[seed.value]) {
                address = _cachedAddresses[seed.value];
            } else {
                address = generateAddress(seed);
                _cachedAddresses[seed.value] = address;
            }
            $('#statusMessage').text('');
        } else {
            var msg = '';
            if (seed.illegal.length)
                msg += seed.value.length + ' characters';
            if (seed.illegal.character)
                msg += 'Illegal character';
            $seedTitle.text('Invalid seed: ' + msg);
            $('#statusMessage').text('Not a valid IOTA seed')
            $butEncrypt.prop('disabled', true);
        }


        // Draw Address
        let $wallet = $(e).find('canvas.wallet-canvas');
        var canvas = $wallet[0];
        var context = canvas.getContext("2d");
        context.clearRect(0, 0, canvas.width, canvas.height);
        drawBackground($('.wallet'), layout);
        if (address) {
            drawQr($wallet, address, 'L', { x: 1, y: 66 });
            drawMultilineText($wallet, 'Address: ', address, 2, { x: 25, y: 0 });
            $('.addresses').html(address);
            $('#tangleExplorer').html('Explore the address <a target="_blank" href="' + tangleUrl + address + '">'+address+'</a>');
        }

        // Draw Seed
        if (seed.type === 'ENCRYPTED') {
            drawQr($wallet, seedValue, 'L', { x: -1, y: 69 });
            drawMultilineText($wallet, 'Encrypted seed: ', seedValue, 2, { x: -25, y: -1 });
        } else {
            //drawStamp($lo, 'CENSORED', 55);
        }
    }


    // ================
    //  Draw functions
    // ================

    function drawQr($canvas, text, correctionLevel, pos) {
        var qrSize = 300;
        $canvas = $($canvas);
        pos = pos || { x: 0, y: 0 };

        correctionLevel = correctionLevel || 'L';
        var qrCanvas = document.createElement('canvas');
        qrCanvas.setAttribute('width', qrSize);
        qrCanvas.setAttribute('height', qrSize);
        //$canvas.after(qrCanvas);
        if ($canvas && $canvas.length) {
            var canvas = $canvas[0];
            if (pos.x < 0) pos.x = canvas.width + pos.x - qrSize;
            if (pos.y < 0) pos.y = canvas.height + pos.y - qrSize;

            if (text) {
                qrcode.toCanvas(qrCanvas, text, { width: qrSize, errorCorrectionLevel: correctionLevel, color: { dark: qrColor, light: '#FF000000' } });
                var image = qrCanvas.getContext('2d').getImageData(0, 0, qrSize, qrSize);
                canvas.getContext('2d').putImageData(image, pos.x, pos.y, 0, 0, qrSize, qrSize);
            } else {
                var context = canvas.getContext("2d");
                context.clearRect(pos.x, pos.y, qrSize, qrSize);
            }
        }
    }

    function drawMultilineText($canvas, title, text, lines, pos) {
        $canvas = $($canvas);
        lines = lines || 1;
        pos = pos || { x: 0, y: 0 };
        text = title + text;

        var fontSize = 12 * 2;
        var lineHeight = fontSize * 1.3;


        if ($canvas && $canvas.length) {
            var canvas = $canvas[0];
            var context = canvas.getContext("2d");
            //context.clearRect(0, 0, canvas.width, canvas.height);
            context.fillStyle = qrColor;
            context.font = ' ' + fontSize * 1.3 + "px Tahoma, Arial, Helvetica, sans-serif";

            if (text) {

                var textLength = context.measureText(text).width;
                var lineWidth = textLength / lines;
                if (pos.x < 0) pos.x = canvas.width + pos.x - lineWidth;
                if (pos.y < 0) pos.y = canvas.height + pos.y - lineHeight * (lines + 0.25);
                var lineNo = 1;
                var start = 0;
                for (var i = 1; i <= text.length; i++) {
                    var subText = text.slice(start, i);
                    var subLineWidth = context.measureText(subText).width;
                    if (subLineWidth > lineWidth || i == text.length) {
                        start = i;
                        var y = lineHeight * lineNo;
                        lineNo++;
                        context.fillText(subText, pos.x, pos.y + y);
                    }
                }
            }
        }
    }

    function drawText($canvas, title, text, pos) {
        $canvas = $($canvas);
        title = title || '';
        pos = pos || { x: 0, y: 0 };
        text = title + text;
        var fontSize = 11 * 2;
        var lineHeight = fontSize * 1.3;

        if ($canvas && $canvas.length) {
            var canvas = $canvas[0];

            var context = canvas.getContext("2d");
            context.fillStyle = qrColor;
            if (text) {
                context.font = fontSize + "px Century Gothic, Arial, Helvetica, sans-serif";
                var textLength = context.measureText(text).width;

                if (pos.x < 0) pos.x = canvas.width + pos.x - textLength;
                if (pos.y < 0) pos.y = canvas.height + pos.y - lineHeight;

                context.clearRect(pos.x, pos.y, canvas.width, lineHeight * 1.2);
                context.fillText(text, pos.x, pos.y + lineHeight);
            }
        }
    }
    function drawStamp($canvas, text, angle) {
        $canvas = $($canvas);
        angle = angle | 0;
        var fontSize = 12 * 2;
        var lineHeight = fontSize * 1.3;

        if ($canvas && $canvas.length) {
            var canvas = $canvas[0];
            var context = canvas.getContext("2d");
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.fillStyle = qrColor;
            if (text) {
                context.font = 'bold ' + fontSize + "px Century Gothic, Arial, Helvetica, sans-serif";
                var textLength = context.measureText(text).width;


                var cx = canvas.width / 2;
                var cy = canvas.height / 2 + 10;
                var y = fontSize / 3.5;
                context.save();
                context.translate(cx, cy);

                context.rotate(-angle / 180 * Math.PI);
                context.textAlign = 'center';
                context.fillText(text, 0, 0);
                drawLine(context, { x: -textLength / 2, y: y - lineHeight }, { x: textLength / 2, y: y - lineHeight }, qrColor);
                drawLine(context, { x: -textLength / 2, y: y }, { x: textLength / 2, y: y }, qrColor);
                context.restore();
            }
        }
    }

    function drawBackground($wallet, layout) {
        var $walletImg = $wallet.find('.wallet-img');
        var image = $walletImg[0];
        var $canvas = $wallet.find('canvas.wallet-canvas');
        let canvas = $canvas[0];
        const context = canvas.getContext('2d');
        let scale =  layout.scale || 1;
        let pos =  layout.background && layout.background.pos || {cx: 0, cy: 0};
        let size =  layout.background && layout.background.size || {width: canvas.width/scale, height: canvas.height/scale};

        let x = $canvas.width()/2 + pos.cx - size.width/2;
        let y = $canvas.height()/2 + pos.cy - size.height/2;

        context.drawImage(image, x*scale, y*scale, size.width*scale, size.height*scale);
    }
    function drawRect(context, location, color) {
        drawLine(context, location.topLeftCorner, location.topRightCorner, color);
        drawLine(context, location.topRightCorner, location.bottomRightCorner, color);
        drawLine(context, location.bottomRightCorner, location.bottomLeftCorner, color);
        drawLine(context, location.bottomLeftCorner, location.topLeftCorner, color);
    }

    function drawLine(context, begin, end, color) {
        context.beginPath();
        context.moveTo(begin.x, begin.y);
        context.lineTo(end.x, end.y);
        context.lineWidth = 4;
        context.strokeStyle = color;
        context.stroke();
    }

    // ====================
    //  Controller Methods
    // ====================

    function parseSeed(seed) {
        var state = { type: 'UNKNOWN', illegal: {}, value: seed };
        seed = seed.trim();
        var parts = seed.split(':');
        seed = parts[0];
        var options = (parts.length > 1 ? parts[1] : "");

        if (seed == '')
            state.type = 'EMPTY';
        else
            state.type = vault.guessEncoding(seed);

        return state;
    }

    function generateAddress(seed) {

        // Normalize all seeds (also bip39, to ensure only one space delimiter, etc)
        let byteSeed = decodeSeedToBytes(seed.value);
        let bip39Seed = encodeByteSeed(byteSeed, 'bip39');


        var addresses = iota.generateAddresses(bip39Seed,);
        return addresses[0];
    }

    function OBSOLETE_addChecksum(address) {
        try {
            return iota.utils.addChecksum(address);
        } catch (err) {
            return "";
        }
    }


    function generateSeed() {
        var seed = vault.generateSeed();
        return seed;
    }



});

if (window && window.location) {
    if (window.location.host == 'vbakke.github.io') {
        // Log visits and actions on the page. No seeds or passwords.
        // Nevertheless, run this page offline if you are serious about you money!
        googleLog = true;

        // Global site tag (gtag.js) - Google Analytics 
        (function (i, s, o, g, r, a, m) {
            i['GoogleAnalyticsObject'] = r; i[r] = i[r] || function () {
                (i[r].q = i[r].q || []).push(arguments)
            }, i[r].l = 1 * new Date(); a = s.createElement(o),
                m = s.getElementsByTagName(o)[0]; a.async = 1; a.src = g; m.parentNode.insertBefore(a, m)
        })(window, document, 'script', 'https://www.google-analytics.com/analytics.js', 'ga');

        ga('create', 'UA-6677714-5', 'auto');
        ga('send', 'pageview');
    }
}
