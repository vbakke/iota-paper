var $ = require('jquery');
var trytes = require('trytes');
var trypto = require('tryte-encrypt');
var qrcode = require('qrcode');
var jsQR = require('jsqr');
var IOTA = require('iota.lib.js');
var Logo = require('./logo.js');

const iota = new IOTA({});
const IOTACHAR = "9ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const tangleUrl = 'https://thetangle.org/address/';

//var seed = 'A999TEST999SEED99999999999999999999999999999999999999999999999999999999999999999Z';
const _cachedAddresses = {};
let googleLog = false;

$(document).ready(function () {
  if (googleLog) {
    $('#warning').addClass('warning').html('&#9888; Do not scan or enter actual seeds unless you are offline in a safe environment! &#9888;'
      + '<br/> You never know who is peeking.');
  }
  displaySeed($('.article'), 'A999TEST999SEED99999999999999999999999999999999999999999999999999999999999999999Z', true);
  clearProgress();

  var logo = new Logo('assets/iota-logo.png', $('canvas.logo')[0]);

  // Event handlers
  $('textarea.seed').on('change input paste', function (e) {
    let text = $(e.target).val();
    displaySeed($(e.target).closest('.article'), text);
  });

  $('button.show-algorithm').click(function (e) {
    var action = ($('.progress:visible').length) ? 'hide' : 'show';
    if (googleLog && ga) ga('send', 'event', 'tryte-encrypt', 'show-algorithm', action);
    
    $('.progress').toggle();
  });

  $('button.generate-seed').click(function (e) {
    if (googleLog && ga) ga('send', 'event', 'tryte-encrypt', 'generateSeed');
    displaySeed($(e.target).closest('.article'), generateSeed(), true);
  });

  $('button.scan-seed').click(function (e) {
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
      var canvas = $(e.target).closest('.article').find('canvas.seed-qr')[0];
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
          //canvas.hidden = false;
          //outputContainer.hidden = false;
          canvas.height = video.videoHeight;
          canvas.width = video.videoWidth;
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
        }
      }
    }
  });

  $('button.encrypt-seed').click(function (e) {
    var $button = $(e.target);
    var $article = $button.closest('.article');
    var seed = $article.find('textarea.seed').val();
    var passphrase = $article.find('textarea.passphrase').val();
    var scryptLevel = parseInt($article.find('select.scrypt-T').val());
    var scryptOptions = { toughness: scryptLevel, interruptStep: 3000 };

    //$('#spinner').addClass('spinner');
    //$('canvas.logo').css('animation-iteration-count', 'infinite');
    $('canvas.logo').removeClass('spinner').width();
    $('canvas.logo').addClass('spinner');
    var seedTranformed;
    ///logo.spinStart(2000, () => {
    ///  if (seedTranformed)
    ///    displaySeed($article, seedTranformed, true);
    ///});

    var decrypt = $button.data('type') == 'DECRYPT';
    $('#statusMessage').text(decrypt ? 'Decrypting...' : 'Encrypting...');
    clearProgress();
    displayModeElements( (decrypt) ? 'decrypt' : 'encrypt' );
    setTimeout(function () {
      if (decrypt) {
        if (googleLog && ga) {
          let toughness = seed.substr(seed.indexOf(':'));
          toughness = (toughness[0] == ':') ? toughness.substr(1) : '';
          ga('send', 'event', 'tryte-encrypt', 'decryptSeed', toughness);
        }
        trypto.decrypt(seed, passphrase, scryptOptions, function (decrypted) {
          $('#statusMessage').text('');
          if (decrypted.length == 81) {
            seedTranformed = decrypted;
            displaySeed($article, decrypted, true);
          } else {
            $('#statusMessage').text('Incorrect passphrase (or encryption options)');
          }
          //$('canvas.logo').css('animation-iteration-count', 1);
          $('canvas.logo').removeClass('spinner')
          ///logo.spinStop();
        }, onProgress);
      } else {
        if (googleLog && ga) ga('send', 'event', 'tryte-encrypt', 'encryptSeed', 'T' + scryptLevel);
        trypto.encrypt(seed, passphrase, scryptOptions, function (encrypted) {
          if (_cachedAddresses[seed]) {
            address = _cachedAddresses[seed];
            delete _cachedAddresses[seed];
            _cachedAddresses[encrypted] = address;
          }

          $('#statusMessage').text('');
          displaySeed($article, encrypted, true);
          seedTranformed = encrypted;
          //$('canvas.logo').css('animation-iteration-count', 1);
          $('canvas.logo').removeClass('spinner')
          ///logo.spinStop();
        }, onProgress);
      }
      //$('#spinner').removeClass('spinner');
      //$('canvas.logo').removeClass('spinner');
      //logo.spinStop();
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
    progress.duration = (progressArray.length == 0) ? 0 : Math.max(1, progress.timestamp - progressArray[progressArray.length-1].timestamp);
    progressArray.push(progress);
    displayProgress(progress);
  }

  function displayProgress(progress) {
    //console.log('Progress:', progress.stage, progress);
    var $progress = $('#progress');
    // Display step info
    var $div = $progress.find('#step' + progress.stage);
    if ($div.length) {
      $div.find('.timing').text(progress.duration+' ms');
    }
    // Display stage info
    var $div = $progress.find('#stage' + progress.stage);
    if ($div.length) {
      var content = parseStageContent(progress.value);
      $div.find('.value').text(content.value);
      $div.find('.length').text(content.length);
    }
    if (progress.stage=='T') {
      $progress.find('#stepP2 .explanation').text('Parameters: logN: '+progress.value.logN+', p: '+progress.value.p+', r: '+progress.value.r);
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

    $('.mode-element').filter('[data-mode="'+mode+'"]').show();
    $('.mode-element').not('[data-mode="'+mode+'"]').hide();

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

    setTimeout(displayWallet, 10, e, seed);
  }

  function displayWallet(e, seed) {
    
    let $select = $(e).find('.scrypt-T');
    if(seed.type == 'ADDRESS') {
      $select.children(':first').text('Standard');
      $select.attr('disabled', 'disabled');
    } else if (seed.value.indexOf(':') > -1) {
      let opts = seed.value.split(':')[1];
      if (opts[0] == 'T' && $select.children("[value='" + opts.substr(1) + "']").length) {
        $select.val(opts[1]);
      } else {
        $select.children(':first').text(opts);
        $select.val('0');
      }
      $select.attr('disabled', 'disabled');
    } else {
      $select.children(':first').text('Standard');
      $select.removeAttr('disabled');
    }
    
    
    
    let $seedTitle = $(e).find('.seedTitle');
    var $butEncrypt = $(e).find('button.encrypt-seed');
    var emptyPassphrase = ($(e).find('textarea.passphrase').val().trim() == '');
    var seedValue = null;
    var address = null;
    var seedTitle = "";
    var addressTitle = 'DEPOSIT';
    if (seed.type == 'ADDRESS') {
      $seedTitle.text('Address:');
      $butEncrypt.text('Encrypt');
      $butEncrypt.data('type', 'DECRYPT');
      $butEncrypt.attr('disabled', 'disabled');
      addressTitle = 'ADDRESS';
      address = seed.value;
    } 
    else if (seed.type == 'ENCRYPTED') {
      $seedTitle.text('Encrypted seed:');
      $butEncrypt.text('Decrypt');
      $butEncrypt.data('type', 'DECRYPT');
      $butEncrypt.prop('disabled', emptyPassphrase);
      address = (_cachedAddresses[seed.value]) ? _cachedAddresses[seed.value] : "";
      seedTitle = 'ENCRYPTED';
      seedValue = seed.value;
    } else {
      $seedTitle.text('Seed:');
      $butEncrypt.text('Encrypt');
      $butEncrypt.data('type', 'ENCRYPT');
      $butEncrypt.prop('disabled', emptyPassphrase || seed.type != 'PLAIN');
      if (seed.type == 'PLAIN') {
        if (_cachedAddresses[seed.value]) {
          address = _cachedAddresses[seed.value];
        } else {
          address = generateAddress(seed.value);
          _cachedAddresses[seed.value] = address;
        }
        $('#statusMessage').text('');
        seedTitle = 'PRIVATE SEED';
        seedValue = seed.value;
      } else {
        var msg = '';
        if (seed.illegal.length)
        msg += seed.value.length + ' characters';
        if (seed.illegal.character)
        msg += 'Illegal character';
        $seedTitle.text('Invalid seed: ' + msg);
        $('#statusMessage').text('Not a valid IOTA seed')
      }
    }


    // Draw Address
    drawQr($(e).find('canvas.address-qr'), address, 'L');
    drawText($(e).find('canvas.address-text'), addressTitle, address, 7);
    $('#tangleExplorer').html('Explore the address at <a href="'+tangleUrl+address+'">thetangle.org</a>.');

    // Draw Seed
    drawQr($(e).find('canvas.seed-qr'), seedValue, 'L');
    drawText($(e).find('canvas.seed-text'), seedTitle, seedValue, 7);
  }


  // ================
  //  Draw functions
  // ================

  function drawQr($canvas, text, correctionLevel) {
    $canvas = $($canvas);
    correctionLevel = correctionLevel || 'L';

    if ($canvas && $canvas.length) {
      var canvas = $canvas[0];
      if (text) {
        qrcode.toCanvas(canvas, text, { version: 4, errorCorrectionLevel: correctionLevel, color: { dark: '#146b64', light: '#FF000000' } });
      } else {
        var context = canvas.getContext("2d");
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }

  function drawText($canvas, title, text, lines) {
    $canvas = $($canvas);
    lines = lines || 1;
    var fontSize = 12 * 2;
    var lineHeight = fontSize * 1.3;
    var x = 2

    if ($canvas && $canvas.length) {
      var canvas = $canvas[0];
      var context = canvas.getContext("2d");
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#146b64';
      context.font = 'bold ' + fontSize * 1.3 + "px Tahoma, Arial, Helvetica, sans-serif";
      context.fillText(title, x, fontSize);

      if (text) {
        context.font = 'bold ' + fontSize + "px Tahoma, Arial, Helvetica, sans-serif";

        var textLength = context.measureText(text).width;
        var lineWidth = textLength / lines;
        var lineNo = 1;
        var start = 0;
        for (var i = 1; i <= text.length; i++) {
          var subText = text.slice(start, i);
          var subLineWidth = context.measureText(subText).width;
          if (subLineWidth > lineWidth || i == text.length) {
            start = i;
            lineNo++;
            var y = lineHeight * lineNo + 10;
            context.fillText(subText, x, y);
          }
        }
      }
    }
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
    else if (! /^[9A-Z]+$/.test(seed))
      state.illegal.character = true;
    else if (seed.length == 81)
      state.type = 'PLAIN';
    else if (seed.length == 90)
      state.type = 'ADDRESS';
    else if (seed.length == 100)
      state.type = 'ENCRYPTED';
    else
      state.illegal.length = true;

    if (options) {
      state.scrypt = {};
      if (options[0] === 'P' && options.length > 1) {
        var p = parseInt(options[1]);
        if (p)
          state.scrypt.p = p;
      }

    }
    return state;
  }

  function generateAddress(seed) {
    var address;
    iota.api.getNewAddress(seed, { total: 1, checksum: true, index: 0 }, (err, addr) => {
      address = addr[0];
    });
    return address;
  }

  function addChecksum(address) {
    try {
      return iota.utils.addChecksum(address);
    } catch (err) {
      return "";
    }
  }


  function generateSeed() {
    var seed = randomTryteChar(81);
    return seed;
  }

  function randomTryteChar(count) {
    count = count || 1;
    let str = "";
    let values = randomValues(27, 81);
    for (var i = 0; i < count; i++) {
      str += IOTACHAR[values[i]];
    }
    return str;
  }

  function randomValues(maxValue, count) {
    if (maxValue > 256)
      throw new Error('Currently, randomValue() cannot create higher values than 256');

    let values = [];
    let randByte = new Uint8Array(1);
    let sets = Math.floor(256 / maxValue);
    let maxRand = maxValue * sets;

    while (values.length < count) {
      window.crypto.getRandomValues(randByte);
      if (randByte[0] < maxRand) {
        let randomValue = randByte[0] % maxValue;
        values.push(randomValue);
      }
    }
    return values;
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
