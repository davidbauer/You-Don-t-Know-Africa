/*
 * Click That ’Hood
 *
 * Front-end written (mostly) by Marcin Wichary, Code for America fellow 
 * in the year 2013.
 *
 * Note: This code is really gnarly. It’s been done under a lot of time 
 * pressure and there’s a lot of shortcut and tech debt. It might be improved
 * later if there’s time later.
 *
 * Note 2: Code made even worse by David Bauer, who is more of a journalist than a coder. ¯\_(ツ)_/¯
 */

var COUNTRY_NAME_USA = 'U.S.';

var EASY_MODE_COUNT = 20;

var HIGHLIGHT_DELAY = 1500;
var NEXT_GUESS_DELAY = 500;

var REMOVE_NEIGHBORHOOD_ANIMATE_GUESS_DELAY = 1000;

var SMALL_NEIGHBORHOOD_THRESHOLD_MOUSE = 5;
var SMALL_NEIGHBORHOOD_THRESHOLD_TOUCH = 25;

var HEADER_WIDTH = 320;
var BODY_MARGIN = 15;

var MAP_VERT_PADDING = 50;

var MAP_BACKGROUND_SIZE_THRESHOLD = (128 + 256) / 2;
var MAP_BACKGROUND_DEFAULT_ZOOM = 12;
var MAP_BACKGROUND_MAX_ZOOM_NON_US = 12;

var MAPBOX_MAP_ID = 'codeforamerica.map-mx0iqvk2';

var ADD_YOUR_CITY_URL = 
    'https://github.com/codeforamerica/click_that_hood/wiki/How-to-add-a-city-to-Click-That-%E2%80%99Hood';

var MAPS_DEFAULT_SCALE = 512;
var D3_DEFAULT_SCALE = 500;

var FACEBOOK_APP_ID = '777235462302407';
var FB_PICTURE = 'http://youdontknowafrica.com/1/public/images/teaser.png';

var startTime = 0;
var timerIntervalId;

var totalNeighborhoodsCount;
var neighborhoods = [];
var neighborhoodsToBeGuessed = [];
var neighborhoodsGuessed = [];
var neighborhoodToBeGuessedLast;
var neighborhoodToBeGuessedNext;

var geoData;
var geoMapPath;

var mapClickable = false;
var gameStarted = false;

var easyMode = false;
var mainMenu = false;

var touchActive = false;
var currentlyTouching = false;
var lastTouchedNeighborhoodEl;

var pixelRatio;

var smallNeighborhoodThreshold;
var smallNeighborhoodsRemoved = [];

var canvasWidth, canvasHeight;
var mapWidth, mapHeight;

var centerLat, centerLon;
var latSpread, lonSpread;

var currentGeoLat, currentGeoLon;

var cityId = '';
var numberOfPlays;
var averageEasy;
var averageHard;

var globalScale;

var bodyLoaded = false;
var geoDataLoaded = false;

var finalTime = null;
var timerStopped = false;

function lonToTile(lon, zoom) { 
  return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
}

function latToTile(lat, zoom) { 
  return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 
      1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
}

function tileToLon(x, zoom) {
  return x / Math.pow(2, zoom) * 360 - 180;
}

function tileToLat(y, zoom) {
  var n = Math.PI - 2 * Math.PI * y / Math.pow(2, zoom);
  return 180 / Math.PI * Math.atan(.5 * (Math.exp(n) - Math.exp(-n)));
}

function updateCanvasSize() {
  canvasWidth = document.querySelector('#map').offsetWidth;
  canvasHeight = document.querySelector('#map').offsetHeight;

  if (screen.width > 768) {
	  mapWidth = canvasWidth - HEADER_WIDTH - BODY_MARGIN * 2;
  }
  
  else {
	  mapWidth = canvasWidth - BODY_MARGIN * 2;
  }
 
	mapHeight = canvasHeight - MAP_VERT_PADDING * 2;
	
	// TODO hack
	if (mapHeight < 0) {
	  mapHeight = 0;
	}
  
}

function calculateMapSize() {

    // TODO const
    var minLat = 99999999;
    var maxLat = -99999999;
    var minLon = 99999999;
    var maxLon = -99999999;

    // TODO move outside
    function findMinMax(lon, lat) {
      if (lat > maxLat) {
        maxLat = lat;
      }
      if (lat < minLat) {
        minLat = lat;
      }
      if (lon > maxLon) {
        maxLon = lon;
      }
      if (lon < minLon) {
        minLon = lon;
      }
    }

    for (var i in geoData.features) {
      for (var z in geoData.features[i].geometry.coordinates) {
        for (var j in geoData.features[i].geometry.coordinates[z]) {

          if (geoData.features[i].geometry.coordinates[z][j].length && 
              typeof geoData.features[i].geometry.coordinates[z][j][0] != 'number') {
            for (var k in geoData.features[i].geometry.coordinates[z][j]) {
              var lon = geoData.features[i].geometry.coordinates[z][j][k][0];
              var lat = geoData.features[i].geometry.coordinates[z][j][k][1];

              findMinMax(lon, lat);
            }
          } else if (geoData.features[i].geometry.coordinates[z][j].length) {
            var lon = geoData.features[i].geometry.coordinates[z][j][0];
            var lat = geoData.features[i].geometry.coordinates[z][j][1];

            findMinMax(lon, lat);
          }

        }
      }
    }

    centerLat = (minLat + maxLat) / 2;
    centerLon = (minLon + maxLon) / 2;
    latSpread = maxLat - minLat;
    lonSpread = maxLon - minLon;

    updateCanvasSize();

    var zoom = MAP_BACKGROUND_DEFAULT_ZOOM;
    var tile = latToTile(centerLat, zoom);
    var latStep = (tileToLat(tile + 1, zoom) - tileToLat(tile, zoom));

    // Calculate for height first
    // TODO: not entirely sure where these magic numbers are coming from
    globalScale = 
        ((D3_DEFAULT_SCALE * 180) / latSpread * (mapHeight - 50)) / 
            MAPS_DEFAULT_SCALE / 0.045 * (-latStep);

    // Adjust map zoom of necessary
    globalScale = 1 * globalScale;
    

    // Calculate width according to that scale
    var width = globalScale / (D3_DEFAULT_SCALE * 360) * 
        lonSpread * MAPS_DEFAULT_SCALE;

    if (width > mapWidth) {
      globalScale = ((D3_DEFAULT_SCALE * 360) / lonSpread * mapWidth) / 
          MAPS_DEFAULT_SCALE;
    }

    geoMapPath = d3.geo.path().projection(
        d3.geo.mercator().center([centerLon, centerLat]).
        scale(globalScale / 6.3).translate([mapWidth / 2, mapHeight / 2]));

}

function createSvg() {
  updateCanvasSize();

  mapSvg = d3.select('#svg-container').append('svg')
      .attr('width', mapWidth)
      .attr('height', mapHeight);  
}

function loadGeoData() {
  var url = 'public/data/africa-new.geojson';
  queue().defer(d3.json, url).await(onGeoDataLoad);
}

function removeSmallNeighborhoods() {
  var els = document.querySelectorAll('#map .neighborhood');

  someSmallNeighborhoodsRemoved = false;
  
  //makeNeighborhoodInactive('Western Sahara');
  //neighborhoods.splice(neighborhoods.indexOf('Western Sahara'), 1);

  for (var i = 0, el; el = els[i]; i++) {
    var boundingBox = el.getBBox();

    if ((boundingBox.width < smallNeighborhoodThreshold) || 
        (boundingBox.height < smallNeighborhoodThreshold)) {
      
      var name = el.getAttribute('name');

      neighborhoods.splice(neighborhoods.indexOf(name), 1);

      makeNeighborhoodInactive(name);
      
      smallNeighborhoodsRemoved.push(name)

      totalNeighborhoodsCount--;

      someSmallNeighborhoodsRemoved = true;
    }
  }

  if (someSmallNeighborhoodsRemoved) {
    document.body.classList.add('neighborhoods-removed');
    updateSmallNeighborhoodDisplay();
  } else {    
    document.body.classList.remove('neighborhoods-removed');
  }
}

function updateSmallNeighborhoodDisplay() {
  var count = smallNeighborhoodsRemoved.length
  var no = Math.floor(Math.random() * count)

  var els = document.querySelectorAll('.small-neighborhood-example')

  for (var i = 0, el; el = els[i]; i++) {
    el.innerHTML = smallNeighborhoodsRemoved[no]
  }
}

function updateCount() {
  if (totalNeighborhoodsCount <= EASY_MODE_COUNT) {
    easyModeCount = totalNeighborhoodsCount;

    document.body.classList.add('no-difficult-game');
  } else {
    easyModeCount = EASY_MODE_COUNT;
  }

  var els = document.querySelectorAll('.easy-mode-count');
  for (var i = 0, el; el = els[i]; i++) {
    el.innerHTML = easyModeCount;
  }

  var els = document.querySelectorAll('.hard-mode-count');
  for (var i = 0, el; el = els[i]; i++) {
    el.innerHTML = totalNeighborhoodsCount;
  }
}

function isString(obj) {
  return typeof obj == 'string';
}

function findNeighborhoodByPoint(x, y) {
  var el = document.elementFromPoint(x, y);

  if (el) {
    if (el.className && typeof el.className.baseVal == 'string') {
      var className = el.className.baseVal;
    } else {
      var className = el.className;
    }

    // Shitty because iPad has old Safari without classList
    if (className && className.indexOf('neighborhood') != -1) {
      return el;
    }
  } 

  return false;
}

function hoverNeighborhoodElByPoint(x, y, showTooltip) {
  var el = findNeighborhoodByPoint(x, y);

  if (el) {
    hoverNeighborhoodEl(el, showTooltip);
  } else {
    hideNeighborhoodHover();
  }
}

function onBodyTouchStart(event) {
  setTouchActive(true);

  var el = event.target;
  while (el && el.id != 'svg-container') {
    el = el.parentNode;
  }

  if (!el || !el.id || el.id != 'svg-container') {
    return;
  }

  lastTouchedNeighborhoodEl = findNeighborhoodByPoint(event.pageX, event.pageY);

  // TODO duplication with above
  hoverNeighborhoodElByPoint(event.pageX, event.pageY, false);

  currentlyTouching = true;

  event.preventDefault();
}

function onBodyTouchMove(event) {
  if (currentlyTouching) {
    if (event.touches[0]) {
      var x = event.touches[0].pageX;
      var y = event.touches[0].pageY;

      lastTouchedNeighborhoodEl = findNeighborhoodByPoint(x, y);

      // TODO duplication with above
      hoverNeighborhoodElByPoint(x, y, false);
    }

    event.preventDefault();
    event.stopPropagation();
  }
}

function onBodyTouchEnd(event) {
  hideNeighborhoodHover();

  if (lastTouchedNeighborhoodEl) {
    onNeighborhoodClick(lastTouchedNeighborhoodEl);
  }

  currentlyTouching = false;
}

function onBodyTouchCancel(event) {
  hideNeighborhoodHover();

  currentlyTouching = false;
}

function addTouchEventHandlers() {
  document.body.addEventListener('touchstart', onBodyTouchStart, false);
  document.body.addEventListener('touchmove', onBodyTouchMove, false);
  document.body.addEventListener('touchend', onBodyTouchEnd, false);
  document.body.addEventListener('touchcancel', onBodyTouchCancel, false);
}

function everythingLoaded() {

    calculateMapSize();
/*     prepareMapBackground(); */

    prepareNeighborhoods();

    createMap();

    addTouchEventHandlers();

    startIntro();
}

function onGeoDataLoad(error, data) {
  geoData = data;

  geoDataLoaded = true;

  checkIfEverythingLoaded();
}

function prepareNeighborhoods() {
  neighborhoods = [];

  for (var i in geoData.features) {
	  if (geoData.features[i].properties.name !== "Western Sahara") {
    neighborhoods.push(geoData.features[i].properties.name);
    }
  }
  neighborhoods.sort();

  totalNeighborhoodsCount = neighborhoods.length;
}

function setTouchActive(newTouchActive) {
  touchActive = newTouchActive;

  if (touchActive) {
    document.body.classList.add('touch-active');
  } else {
    document.body.classList.remove('touch-active');    
  }

  var els = document.querySelectorAll('.click-verb');
  for (var i = 0, el; el = els[i]; i++) {
    el.innerHTML = touchActive ? 'tap' : 'click';
  }
}

function hoverNeighborhoodEl(el, showTooltip) {
  var boundingBox = el.getBBox();

  var hoverEl = document.querySelector('#neighborhood-hover');

  var name = el.getAttribute('name');

  if (showTooltip && ((hoverEl.innerHTML != name) || 
      (!hoverEl.classList.contains('visible')))) {
    hoverEl.classList.remove('visible');  

    hoverEl.innerHTML = name;

    if (touchActive) {
      var top = boundingBox.y - hoverEl.offsetHeight - 30;
    } else {
      var top = boundingBox.y + boundingBox.height;
    }

    var left = (boundingBox.x + boundingBox.width / 2 - hoverEl.offsetWidth / 2);

    hoverEl.style.top = top + 'px'; 
    hoverEl.style.left = left + 'px';

    if (el.getAttribute('inactive')) {
      hoverEl.classList.add('inactive');
    } else {
      hoverEl.classList.remove('inactive');
    }

    hoverEl.classList.add('visible');  
  }

  // Fix for Safari 6
  if (!el.classList) {
    hideSafariNeighborhood();

    if (!el.id) {
      el.style.webkitTransition = 'none';
      if (!el.getAttribute('inactive')) {
        el.style.fill = 'rgba(247, 148, 29, 0.5)';
      } else {
        el.style.fill = 'rgba(108, 108, 108, 0.775)';
      }
      el.id = 'safari-neighborhood-hover';
    }
  }
}

function hideSafariNeighborhood() {
  var el = document.querySelector('#safari-neighborhood-hover');
  if (el) {
    el.id = '';

    if (el.getAttribute('guessed')) {
      el.style.fill = 'rgba(0, 255, 0, .25)';
      el.style.stroke = 'transparent';
    } else {
      el.style.fill = '';      
    }
  }
}

function hideNeighborhoodHover() {
  hideSafariNeighborhood();

  document.querySelector('#neighborhood-hover').classList.remove('visible');
}

function createMap() {
  mapSvg
    .selectAll('path')
    .data(geoData.features)
    .enter()
    .append('path')
    .attr('d', geoMapPath)
    .attr('class', 'neighborhood unguessed')
    .attr('name', function(d) { return d.properties.name; })
    .on('click', function(d) {
      var el = d3.event.target || d3.event.toElement;

      onNeighborhoodClick(el);
    })
    .on('mousedown', function(d) {
      setTouchActive(false);

      d3.event.preventDefault();
    })
    .on('mouseover', function(d) {
      if (!touchActive) {
        var el = d3.event.target || d3.event.toElement;
        // if (easyMode) {hoverNeighborhoodEl(el, true);}  make tooltips visible in easy mode
      }
    })
    .on('mouseout', function(d) {
      hideNeighborhoodHover();
    });

  onResize();
}

function setMapClickable(newMapClickable) {
  mapClickable = newMapClickable;

  if (mapClickable) {
    document.body.classList.remove('no-hover');
  } else {
    document.body.classList.add('no-hover');    
  }
}

function animateNeighborhoodGuess(el) {
  var animEl = el.cloneNode(true);
  if (animEl.classList) {
    el.parentNode.appendChild(animEl);

    animEl.classList.remove('guessed');
    animEl.classList.add('guessed-animation');

    window.setTimeout(function() {
      animEl.classList.add('animate');
    }, 0);

    window.setTimeout(function() { animEl.parentNode.removeChild(animEl); }, REMOVE_NEIGHBORHOOD_ANIMATE_GUESS_DELAY);
  }
}

function onNeighborhoodClick(el) {
  if (!mapClickable) {
    return;
  }

  if (el.getAttribute('inactive')) {      
    return;
  }

  var name = el.getAttribute('name');

  // Assuming accidental click on a neighborhood already guessed
  if (neighborhoodsGuessed.indexOf(name) != -1) {
    return;
  }

  setMapClickable(false);

  if (name == neighborhoodToBeGuessedNext) {
    if (el.classList) {
      el.classList.remove('unguessed');
      el.classList.add('guessed');

      animateNeighborhoodGuess(el);
    } else {
      // Fix for early Safari 6 not supporting classes on SVG objects
      el.style.fill = 'rgba(0, 255, 0, .25)';
      el.style.stroke = 'transparent';

      el.setAttribute('guessed', true);
    }

    neighborhoodsGuessed.push(name);

    neighborhoodsToBeGuessed.splice(neighborhoodsToBeGuessed.indexOf(name), 1);

    updateGameProgress();

    if (neighborhoodsToBeGuessed.length == 0) {
      gameOver();
    } else {
      window.setTimeout(nextGuess, NEXT_GUESS_DELAY);
    }
  } else {
    if (el.classList) {
      el.classList.remove('unguessed');
      el.classList.add('wrong-guess');
    } else {
      // Fix for early Safari 6 not supporting classes on SVG objects
      el.style.fill = 'rgba(255, 0, 0, .7)';
      el.style.stroke = 'white';
      el.id = 'safari-wrong-guess';
    }

    var correctEl = document.querySelector('#map svg [name="' + neighborhoodToBeGuessedNext + '"]');
    if (correctEl.classList) {
      correctEl.classList.add('right-guess');
    } else {
      // Fix for early Safari 6 not supporting classes on SVG objects
      correctEl.style.webkitAnimationName = 'blink';
      correctEl.style.webkitAnimationDuration = '500ms';
      correctEl.style.webkitAnimationIterationCount = 'infinite';
      correctEl.id = 'safari-right-guess';
    }

    window.setTimeout(removeNeighborhoodHighlights, HIGHLIGHT_DELAY);
    window.setTimeout(nextGuess, HIGHLIGHT_DELAY + NEXT_GUESS_DELAY);
  }

  neighborhoodToBeGuessedLast = neighborhoodToBeGuessedNext;
  neighborhoodToBeGuessedNext = '';
  updateNeighborhoodDisplay();
}

function updateGameProgress() {
  document.querySelector('#count').innerHTML = 
      neighborhoodsGuessed.length + ' of ' + 
      (neighborhoodsGuessed.length + neighborhoodsToBeGuessed.length);

  document.querySelector('#count-time-wrapper-wrapper').classList.add('visible');
}

function removeNeighborhoodHighlights() {
  var el = document.querySelector('#map svg .wrong-guess');
  if (el) {
    el.classList.remove('wrong-guess');
    el.classList.add('unguessed');
  }
  var el = document.querySelector('#map svg .right-guess');
  if (el) {
    el.classList.remove('right-guess');
    el.classList.add('unguessed');
  }

  // Fix for early Safari 6 not supporting classes on SVG objects
  var el = document.querySelector('#safari-wrong-guess');
  if (el) {
    el.id = '';

    if (el.getAttribute('guessed')) {
      el.style.fill = 'rgba(0, 255, 0, .25)';
      el.style.stroke = 'transparent';
    } else {
      el.style.fill = '';      
      el.style.stroke = 'white';
    }
  }
  var el = document.querySelector('#safari-right-guess');
  if (el) {
    el.id = '';
    el.style.webkitAnimationName = '';
    el.style.stroke = 'white';
    el.style.fill = '';
  }
}

function updateNeighborhoodDisplay() {
  if (neighborhoodToBeGuessedNext) {
    document.querySelector('#neighborhood-guess').classList.add('visible');  
  } else {
    document.querySelector('#neighborhood-guess').classList.remove('visible');      
  }

  document.querySelector('#neighborhood-guess .name').innerHTML = 
    neighborhoodToBeGuessedNext;  
}

function nextGuess() {
  setMapClickable(true);

  do {
    var pos = Math.floor(Math.random() * neighborhoodsToBeGuessed.length);
    neighborhoodToBeGuessedNext = neighborhoodsToBeGuessed[pos];
  } while ((neighborhoodToBeGuessedLast == neighborhoodToBeGuessedNext) &&
           (neighborhoodsToBeGuessed.length > 1));
  updateNeighborhoodDisplay();
}

function startIntro() {
  document.querySelector('#loading').classList.remove('visible');
  document.querySelector('#intro').classList.add('visible');
  document.querySelector('#mobilelogo').classList.add('mobilevisible');
}

function makeAllNeighborhoodsActive() {
  var els = document.querySelectorAll('#map svg [inactive]');

  for (var i = 0, el; el = els[i]; i++) {
    el.removeAttribute('inactive');
  } 
}

function makeNeighborhoodInactive(name) {
  var el = document.querySelector('#map svg [name="' + name + '"]');

  el.setAttribute('inactive', true);
}

function removeNeighborhoodsForEasyMode() {
  
  makeNeighborhoodInactive('Western Sahara');
  
  while (neighborhoodsToBeGuessed.length > EASY_MODE_COUNT) {
    var pos = Math.floor(Math.random() * neighborhoodsToBeGuessed.length);

    var name = neighborhoodsToBeGuessed[pos];

    makeNeighborhoodInactive(name);

    neighborhoodsToBeGuessed.splice(pos, 1);
  }
}

function reloadPage() {
  location.reload();
}


function retrieveData() { // get data from the database

	myDataRef.on("value", function(snapshot) {
	  
	  data = snapshot.val();
	  numberOfPlays = data['plays'];
	  fillNumberOfPlays();
/*
	  averageEasy =
	  averageHard =
*/
	}, function (errorObject) {
	  console.log("The read failed: " + errorObject.code);
	});
	
};
 
function fillNumberOfPlays() {

var els = document.querySelectorAll('span.number-of-plays');

// pretty dumb workaround to make sure a manipulated counter isn't displayed
if (typeof numberOfPlays === 'number' && numberOfPlays > 1451400 && numberOfPlays < 2000000 ) {
  for (var i = 0, el; el = els[i]; i++) {
  el.innerHTML = numberOfPlays.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "&thinsp;");;
  };	
}

else {
  for (var i = 0, el; el = els[i]; i++) {
  el.innerHTML = "1451408";
};

}

}

// save new plays count in firebase
function updatePlaysCount() {
 	myDataRef.set({plays: numberOfPlays+1});
}
 

function startGame(useEasyMode) {
  gameStarted = true;
  
  updatePlaysCount();
  
  document.querySelector('#intro').classList.remove('visible');
  document.querySelector('#mobilelogo').classList.remove('mobilevisible');  
  document.querySelector('#cover').classList.remove('visible');

  neighborhoodsToBeGuessed = [];
  for (var i in neighborhoods) {
    neighborhoodsToBeGuessed.push(neighborhoods[i]);
  }

  easyMode = useEasyMode;
  if (easyMode) {
    removeNeighborhoodsForEasyMode();
  }

  updateGameProgress();

  startTime = new Date().getTime();
  updateTimer();
  
  window.setTimeout(function() {
    startTime = new Date().getTime();
    timerIntervalId = window.setInterval(updateTimer, 100);
  }, NEXT_GUESS_DELAY);

  window.setTimeout(nextGuess, NEXT_GUESS_DELAY);
}

function createTimeout(fn, data, delay) {
  window.setTimeout(function() { fn.call(null, data); }, delay);
}

function stopTimer() {
  timerStopped = true;
  finalTime = new Date().getTime();
  window.clearInterval(timerIntervalId);  

  updateTimer();
}

function gameOver() {
  stopTimer();

  setMapClickable(false);
  var els = document.querySelectorAll('#map .guessed');

  // TODO constants
  var timer = 300;
  var timerDelta = 100;
  var timerDeltaDiff = 5;
  var TIMER_DELTA_MIN = 10; 

  for (var i = 0, el; el = els[i]; i++) {
    createTimeout(function(el) { animateNeighborhoodGuess(el); }, el, timer);

    timer += timerDelta;
    timerDelta -= timerDeltaDiff;
    if (timerDelta < TIMER_DELTA_MIN) {
      timerDelta = TIMER_DELTA_MIN;
    }
  }

  // TODO constants
  window.setTimeout(gameOverPart2, timer + 1000);
}

function getSharingMessage() {
  if (easyMode) {
  return 'I just played #YouDontKnowAfrica and found ' + 
      neighborhoodsGuessed.length + ' African countries on the map in ' + getTimer() + '. Can you do better?';
      }
  else {return 'I just played #YouDontKnowAfrica in hard mode and found ' + 
      neighborhoodsGuessed.length + ' African countries on the map in ' + getTimer() + '. Can you do better?';}
}

function updateFacebookLink(congratsEl) {
  var el = congratsEl.querySelector('#share-via-facebook');

  var text = getSharingMessage();
  var url = location.href;

  el.href = 'https://www.facebook.com/dialog/feed?' +
      'app_id=' + FACEBOOK_APP_ID +
      '&redirect_uri=' + encodeURIComponent(url) + 
      '&display=page' +
      '&link=' + encodeURIComponent(url) + 
      '&name=' + encodeURIComponent('[PLAY NOW] You Don\'t Know Africa') +
      '&description=' + encodeURIComponent(text) +
      '&picture=' + FB_PICTURE;
}

function updateTwitterLink(congratsEl) {
  var el = congratsEl.querySelector('#share-via-twitter');

  var text = getSharingMessage();
  var url = location.href;

  if (easyMode) {
  	el.href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + 
      '&url=' + encodeURIComponent(url) + '&via=davidbauer';
      }
  else {
	  el.href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + 
      '&url=' + encodeURIComponent(url);
  }
}

function updateWhatsappLink(congratsEl) {
  var el = congratsEl.querySelector('#share-via-whatsapp');

  var text = getSharingMessage();
  var url = location.href;

  el.href = 'whatsapp://send?text=' + encodeURIComponent(text) + ' ' + encodeURIComponent(url);
}

function updateEmailLink(congratsEl) {
  var el = congratsEl.querySelector('#share-via-email');

  var text = getSharingMessage();
  var url = location.href;

  el.href = 'mailto:?subject=You will like this game: You Don\'t Know Africa&body=' + text + 
      ' ' + url;
}

function gameOverPart2() {
  var el = document.querySelector(easyMode ? '#congrats-easy' : '#congrats-hard');

  document.querySelector('#count-time-wrapper-wrapper').classList.remove('visible');
//   document.querySelector('#more-cities-wrapper-wrapper').classList.add('visible');

  updateTwitterLink(el);
  updateFacebookLink(el);
  updateWhatsappLink(el);
  updateEmailLink(el);

  document.querySelector('#cover').classList.add('visible');
  el.classList.add('visible');  
}

function getTimer() {
  if (!timerStopped) {
    var time = new Date().getTime();
  } else {
    var time = finalTime;
  }

  var elapsedTime = Math.floor((time - startTime) / 100);

  var tenthsOfSeconds = elapsedTime % 10;

  var seconds = Math.floor(elapsedTime / 10) % 60;
  if (seconds < 10) {
    seconds = '0' + seconds;
  }

  var minutes = Math.floor(elapsedTime / 600);

  return minutes + ':' + seconds + '.' + tenthsOfSeconds;
}

function updateTimer() {
  var timeHtml = getTimer();

  var els = document.querySelectorAll('.time');
  for (var i = 0, el; el = els[i]; i++) {
    el.innerHTML = timeHtml;
  } 
}

/*
function prepareMapBackground() {
  if (!geoDataLoaded) {
    return;
  }

  updateCanvasSize();

  // TODO this is the worst line of code ever written
  var size = globalScale * 0.0012238683395795992 * 0.995 / 2 * 0.800 / 2 / 4;

  var zoom = MAP_BACKGROUND_DEFAULT_ZOOM + 2;

  while (size < MAP_BACKGROUND_SIZE_THRESHOLD) {
    size *= 2;
    zoom--;
  } 
  // TODO resize properly instead of recreating every single time
  document.querySelector('#maps-background').innerHTML = '';

  var layer = mapbox.layer().id(MAPBOX_MAP_ID);
  var map = mapbox.map(document.querySelector('#maps-background'), layer, null, []);

  if (pixelRatio == 2) {
    zoom++;
  }

  
  var maxZoomLevel = MAP_BACKGROUND_MAX_ZOOM_NON_US;
  
  while (zoom > maxZoomLevel) {
    zoom--;
    size *= 2;
  }

  map.tileSize = { x: Math.round(size / pixelRatio), 
                   y: Math.round(size / pixelRatio) };

  var tile = latToTile(centerLat, zoom);
  var longStep = 
      (tileToLon(1, zoom) - tileToLon(0, zoom)) / 256 * 128;
  var latStep = 
      (tileToLat(tile + 1, zoom) - tileToLat(tile, zoom)) / 256 * 128;

  var lat = centerLat;
  var lon = centerLon;

  var leftMargin = BODY_MARGIN * 2 + HEADER_WIDTH;

  var ratio = leftMargin / map.tileSize.x;

  lon -= ratio * longStep;
  
  map.centerzoom({ lat: lat, lon: lon }, zoom);
}
*/

function onResize() {

  var height = window.innerHeight;

  document.querySelector('body > .canvas').style.height = 
    (height - document.querySelector('body > .canvas').offsetTop) + 'px';
    
  if (geoDataLoaded) {
      calculateMapSize();
/*       prepareMapBackground(); */

      mapSvg.attr('width', mapWidth);
      mapSvg.attr('height', mapHeight);
      mapSvg.selectAll('path').attr('d', geoMapPath);

      if (!gameStarted) {
        prepareNeighborhoods();
        makeAllNeighborhoodsActive();
        removeSmallNeighborhoods();
        updateCount();
      }
  }
  
}
/*

function getNeighborhoodNoun(plural) {
  if (!plural) {
    return (CITY_DATA[cityId].neighborhoodNoun && CITY_DATA[cityId].neighborhoodNoun[0]) || DEFAULT_NEIGHBORHOOD_NOUN_SINGULAR;
  } else { 
    return (CITY_DATA[cityId].neighborhoodNoun && CITY_DATA[cityId].neighborhoodNoun[1]) || DEFAULT_NEIGHBORHOOD_NOUN_PLURAL;
  }
}
*/

function prepareLocationList() {
  var ids = [];
  for (var id in CITY_DATA) {
    ids.push(id);
  }

  ids.sort(function(a, b) {
    return (CITY_DATA[a].longLocationName || CITY_DATA[a].locationName) >
        (CITY_DATA[b].longLocationName || CITY_DATA[b].locationName) ? 1 : -1;
  });

  for (var i in COUNTRY_NAMES) {
    var el = document.createElement('h1');
    el.innerHTML = COUNTRY_NAMES[i];
    document.querySelector('.menu .locations').appendChild(el);

    for (var id in ids) {
      var cityData = CITY_DATA[ids[id]];

      if ((cityData.countryName != COUNTRY_NAMES[i]) && 
          (!cityData.stateName || (COUNTRY_NAMES[i] != COUNTRY_NAME_USA)) &&
          (cityData.stateName || cityData.countryName || (COUNTRY_NAMES[i] != 'The World'))) {
        continue;
      }

      var el = document.createElement('li');

      el.setAttribute('city-id', ids[id]);

      if (!cityData.stateName && !cityData.countryName && ids[id] != "africa") {
        var url = 'http://www.click-that-hood.com/?location=' + ids[id];
      }       
      else if (ids[id] == "africa") {
	    var url = '?location=' + ids[id];  
      }
      else {
        var url = 'http://www.click-that-hood.com/?city=' + ids[id];        
      }

      var html = '<a href="' + url + '" target="_blank">';

      html += cityData.longLocationName || cityData.locationName;
      if (cityData.annotation) {
        html += '<span class="annotation">' + cityData.annotation + '</span>';
      }
      html += '</a>';
      el.innerHTML = html;

      document.querySelector('.menu .locations').appendChild(el);
    }
  }

  var el = document.createElement('h1');
  el.innerHTML = '';
  document.querySelector('.menu .locations').appendChild(el);

  var el = document.createElement('li');
  el.innerHTML = '<a target="_blank" class="add-your-city" href="' + 
      ADD_YOUR_CITY_URL + '">Add your city…</a>';
  document.querySelector('.menu .locations').appendChild(el);

  if (cityId) {
    var el = document.querySelector('li[city-id="' + cityId + '"]');
    el.classList.add('selected');
  }
}

function getEnvironmentInfo() {
  setTouchActive(Modernizr.touch);
  pixelRatio = window.devicePixelRatio || 1;

  if (touchActive) {
    smallNeighborhoodThreshold = SMALL_NEIGHBORHOOD_THRESHOLD_TOUCH;
  } else {
    smallNeighborhoodThreshold = SMALL_NEIGHBORHOOD_THRESHOLD_MOUSE;
  }
  
}

function checkIfEverythingLoaded() {
  if (geoDataLoaded && bodyLoaded) {
    everythingLoaded();
  }
}

function onBodyLoad() {
  bodyLoaded = true;
  checkIfEverythingLoaded();
}

/*
function deg2rad(deg) {
  return deg * (Math.PI/180)
}
*/

/*
function geoDist(lat1, lon1, lat2, lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2 - lat1);
  var dLon = deg2rad(lon2 - lon1); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c; // Distance in km
  return d;
}
*/

/*
function receiveGeolocation(position) {
  currentGeoLat = position.coords.latitude;
  currentGeoLon = position.coords.longitude;

  for (var id in CITY_DATA) {
    var cityData = CITY_DATA[id];

    var cityLat = cityData.sampleLatLon[1];
    var cityLon = cityData.sampleLatLon[0];

    var dist = geoDist(cityLat, cityLon, currentGeoLat, currentGeoLon);

    // TODO const
    if (dist < 150) {
      var el = document.querySelector('li[city-id="' + id + '"]');
      el.classList.add('nearby');
    }
  }

}
*/


/*
function prepareGeolocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(receiveGeolocation);
  }
}
*/


function onMoreCitiesClick() {
  document.body.scrollTop = window.innerHeight;
}

function testBrowser() {
  var goodEnoughBrowser = document.body.classList;

  if (!goodEnoughBrowser) {
    document.getElementById('wrong-browser').style.display = 'block';
  }

  return goodEnoughBrowser;
}

function main() {
	
  if (testBrowser()) {
    
    window.addEventListener('load', onBodyLoad, false);
    window.addEventListener('resize', onResize, false);

    getEnvironmentInfo();
    cityId = "africa";
    
    retrieveData();

    onResize();

    document.querySelector('#cover').classList.add('visible');
/*     document.querySelector('#mobilelogo').classList.add('mobilevisible'); */
    document.querySelector('#loading').classList.add('visible');

	loadGeoData();
    createSvg();
    
    document.querySelector('#more-cities-wrapper div').
        addEventListener('click', onMoreCitiesClick, false);
    
    prepareLocationList();

    onResize();
  }
}