/*
 * Original code written (mostly) by Marcin Wichary, Code for America fellow 
 * in the year 2013.
 *
 */

var TESTING_MODE_COUNT = 5;

var HIGHLIGHT_DELAY = 1500;
var NEXT_GUESS_DELAY = 500;

var REMOVE_NEIGHBORHOOD_ANIMATE_GUESS_DELAY = 1000;

var SMALL_NEIGHBORHOOD_THRESHOLD_MOUSE = 5;
var SMALL_NEIGHBORHOOD_THRESHOLD_TOUCH = 5;

var HEADER_WIDTH = 320;
var BODY_MARGIN = 15;

var MAP_VERT_PADDING = 50;

var MAP_BACKGROUND_SIZE_THRESHOLD = (128 + 256) / 2;
var MAP_BACKGROUND_DEFAULT_ZOOM = 12;
var MAP_BACKGROUND_MAX_ZOOM_NON_US = 12;

var MAPS_DEFAULT_SCALE = 512;
var D3_DEFAULT_SCALE = 500;

var shareUrl = "https://www.youdontknowafrica.com/impossible";
var FACEBOOK_APP_ID = '777235462302407';
var FB_PICTURE = 'https://youdontknowafrica.com/impossible/images/teaser-impossible.png';

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

var testingMode = false;
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

var numberOfPlays;

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
  
  var url = 'public/data/africa-flags.geojson';
  queue().defer(d3.json, url).await(onGeoDataLoad);
  
}

function removeSmallNeighborhoods() {
  var els = document.querySelectorAll('#map .neighborhood');

  someSmallNeighborhoodsRemoved = false;
  
  makeNeighborhoodInactive('🇪🇭');
  neighborhoods.splice(neighborhoods.indexOf('🇪🇭'), 1);

  for (var i = 0, el; el = els[i]; i++) {
    var boundingBox = el.getBBox();

    if ((boundingBox.width < smallNeighborhoodThreshold) || 
        (boundingBox.height < smallNeighborhoodThreshold)) {
      
      var flag = el.getAttribute('name');

      neighborhoods.splice(neighborhoods.indexOf(flag), 1);

      makeNeighborhoodInactive(flag);
      
      smallNeighborhoodsRemoved.push(flag)

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
  if (totalNeighborhoodsCount <= TESTING_MODE_COUNT) {
    testingModeCount = totalNeighborhoodsCount;

    document.body.classList.add('no-difficult-game');
  } else {
    testingModeCount = TESTING_MODE_COUNT;
  }

  var els = document.querySelectorAll('.testing-mode-count');
  for (var i = 0, el; el = els[i]; i++) {
    el.innerHTML = testingModeCount;
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
    neighborhoods.push(geoData.features[i].properties.flag);
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

/*
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
*/

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
    .attr('name', function(d) { return d.properties.flag; })
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

  var flag = el.getAttribute('name');

  // Assuming accidental click on a neighborhood already guessed
  if (neighborhoodsGuessed.indexOf(flag) != -1) {
    return;
  }

  setMapClickable(false);

  if (flag == neighborhoodToBeGuessedNext) {
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

    neighborhoodsGuessed.push(flag);

    neighborhoodsToBeGuessed.splice(neighborhoodsToBeGuessed.indexOf(flag), 1);

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
}

function makeAllNeighborhoodsActive() {
  var els = document.querySelectorAll('#map svg [inactive]');

  for (var i = 0, el; el = els[i]; i++) {
    el.removeAttribute('inactive');
  } 
}

function makeNeighborhoodInactive(flag) {
  var el = document.querySelector('#map svg [name="' + flag + '"]');

  el.setAttribute('inactive', true);
}

function removeNeighborhoodsForTestingMode() {
  while (neighborhoodsToBeGuessed.length > TESTING_MODE_COUNT) {
    var pos = Math.floor(Math.random() * neighborhoodsToBeGuessed.length);

    var flag = neighborhoodsToBeGuessed[pos];

    makeNeighborhoodInactive(flag);

    neighborhoodsToBeGuessed.splice(pos, 1);
  }
}

function reloadPage() {
  location.reload();
}
 

function startGame(useTestingMode) {
  gameStarted = true;
    
  document.querySelector('#intro').classList.remove('visible');
  document.querySelector('#cover').classList.remove('visible');

  neighborhoodsToBeGuessed = [];
  for (var i in neighborhoods) {
    neighborhoodsToBeGuessed.push(neighborhoods[i]);
  }

  testingMode = useTestingMode;
  if (testingMode) {
    removeNeighborhoodsForTestingMode();
  }

  updateGameProgress();

  startTime = new Date().getTime()
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
  
  // final flash
  $("#congrats").addClass("gamesuccess");

  window.setTimeout(gameOverPart2, timer + 300);
  
  console.log("saving finisher time...: " + getTimer());
  finishersDB.push({"time": getTimer()}); // save finisher time to DB
}

//******* sharing functions ********************


// create sharing text based on success or fail
function getSharingMessage() {
  return 'It took ' + getTimer("long") + ' of my life (not counting all the failed attempts), but I made it! I completed the 😱Impossible Edition😱 of #YouDontKnowAfrica. Can you do it, too?';
}


// generate Facebook link
function updateFacebookLink() {
  var el = $('#share-via-facebook');

  var text = getSharingMessage();
  
  var href = 'https://www.facebook.com/dialog/feed?' +
      'app_id=' + FACEBOOK_APP_ID +
      '&redirect_uri=' + encodeURIComponent(shareUrl) + 
      '&display=page' +
      '&link=' + encodeURIComponent(shareUrl) + 
      '&name=' + encodeURIComponent('[PLAY NOW] You Don\'t Know Africa') +
      '&description=' + encodeURIComponent(text) +
      '&picture=' + FB_PICTURE;
      
   el.attr("href", href)
}

// generate Twitter link
function updateTwitterLink() {
  var el = $('#share-via-twitter');

  var text = getSharingMessage();
  var href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + 
      '&url=' + encodeURIComponent(shareUrl);

  el.attr("href", href)
  	
}

// generate Whatsapp link
function updateWhatsappLink() {
  var el = $('#share-via-whatsapp');

  var text = getSharingMessage();

  var href = 'whatsapp://send?text=' + encodeURIComponent(text) + ' ' + encodeURIComponent(shareUrl);
  
  el.attr("href", href)
}

// generate Email link
function updateEmailLink() {
  var el = $('#share-via-email');

  var text = getSharingMessage();

  var href = 'mailto:?subject=You will like this game: You Don\'t Know Africa&body=' + text + 
      ' ' + shareUrl;
      
  el.attr("href", href)
}

function gameOverPart2() {
  var el = document.querySelector('#congrats');

  document.querySelector('#count-time-wrapper-wrapper').classList.remove('visible');
  
  $('.endtime').html(getTimer("long"));

  updateTwitterLink(el);
  updateFacebookLink(el);
  updateWhatsappLink(el);
  updateEmailLink(el);

  document.querySelector('#cover').classList.add('visible');
  el.classList.add('visible');  
}

function getTimer(format) {
  if (!timerStopped) {
    var time = new Date().getTime() + partOneTime; // add time from part 1 
  } else {
    var time = finalTime + partOneTime; // add time from part 1
  }

  var elapsedTime = Math.floor((time - startTime) / 100);

  var seconds = Math.floor(elapsedTime / 10) % 60;
  if (seconds < 10) {
    seconds = '0' + seconds;
  }

  var minutes = Math.floor(elapsedTime / 600);

  if (format === "long") {
	  return minutes + ' minutes and ' + seconds + ' seconds';
  }
  
  else {
	  return minutes + ':' + seconds;
  }
  
}

function updateTimer() {
  var timeHtml = getTimer();

  var els = document.querySelectorAll('.time');
  for (var i = 0, el; el = els[i]; i++) {
    el.innerHTML = timeHtml;
  } 
}

function onResize() {

  var height = window.innerHeight;

  document.querySelector('body .canvas').style.height = 
    (height - document.querySelector('body .canvas').offsetTop) + 'px';
        
  if (geoDataLoaded) {
	  
	  
      calculateMapSize();

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
  if (geoDataLoaded /* && bodyLoaded */) {
    everythingLoaded();
  }
}

function onBodyLoad() {
  bodyLoaded = true;
  checkIfEverythingLoaded();
}


function onMoreCitiesClick() {
  document.body.scrollTop = window.innerHeight;
}

function testBrowser() {
  var goodEnoughBrowser = document.body.classList;

  return goodEnoughBrowser; 
  
  
  
}

function main() {
			
  if (testBrowser()) {
    
    window.addEventListener('load', onBodyLoad, false); // TODO: This doesn't work if no new page is loaded? condition commented out on line 952
    window.addEventListener('resize', onResize, false);

    getEnvironmentInfo();
    
    onResize();

    document.querySelector('#cover').classList.add('visible');
    document.querySelector('#loading').classList.add('visible');
    
	loadGeoData();
    createSvg();

    onResize();
  }
}