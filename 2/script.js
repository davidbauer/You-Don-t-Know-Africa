var countrylist;

var goalCount = 20;
var correctCount = 0;

var knowAfrica = false;
var gameDifficulty;

var numberOfPlays;

var missedcountries = [];
var guessedcountries = [];
var allguesses = [];

var startTime = 0;
var maxTime = 1200; // in tenths of seconds
var timeOver = false;
var timerIntervalId;
var finalTime = null;
var timerStopped = false;
var timerAlert = false;

var feedbackHint = false;

var shareUrl = "https://www.youdontknowafrica.com/2";
var FACEBOOK_APP_ID = '777235462302407';
var FB_PICTURE = 'https://youdontknowafrica.com/2/images/teaser-sequel.png';



$(function() {

	// load country data
	loadCountries();
	
	// load plays stats from firebase
	retrieveData();
				
	$('#countryguess').submit(function(e) {
		
		e.preventDefault(); // Stop the form from sending and reloading the page

		var guess = document.getElementById('userguess').value;
		guess = guess.trim(); // don't be fussy about spaces
				
		validateCountry(guess)		
	});
});


//******* setting up functions ********************

//activate testing mode
function startTesting() {
	$('.testing').removeClass('hidden');
}

// load and save list of countries
function loadCountries() {
	
	$.getJSON("countries.json", function(json) {
    countrylist = json;
    console.log(countrylist);
	});
	
}

// get current plays number from firebase
function retrieveData() { 
	myDataRef.on("value", function(snapshot) {
	  
	  data = snapshot.val();
	  numberOfPlays = data['plays'];

	}, function (errorObject) {
	  console.log("The read failed: " + errorObject.code);
	});
	
};

// make everything ready when user clicks start
function startGame(difficulty) {
	
	gameDifficulty = difficulty;
	
	// hide and reveal stuff
	$('.pregame').addClass('hidden');
	$('.ingame').removeClass('hidden');
	
	// focus input field so the user can start typing right away (fallback in case autofocus attr doesn't work)
	$('#userguess').focus();
	
	
	// adjust settings to hard mode
	if (difficulty === "hard") {
		goalCount = 54;
		maxTime = 6000;
		$("#intro").html("Name all African countries in less than 10 minutes.")
	} 
	
	$('#goalCount').html(goalCount);
	
	// start timer
	startTime = new Date().getTime();
	updateTimer();
	window.setTimeout(function() {
    startTime = new Date().getTime();
    timerIntervalId = window.setInterval(updateTimer, 100);
	}, 500);
	
	// update play count in database once 5 secs are played
	setTimeout(function(){ 
    	logPlays(); 
    }, 3000);
	
	
}

//******* user input functions ********************

// check if user input is correct

function validateCountry(guess) {
			
	countryobj = countrylist.find(obj => obj.accepted.includes(guess.toLowerCase()))
		
	if (countryobj === undefined) {
		
		// check if we should trigger an easteregg
		if (guess.toLowerCase() === "nambia" || guess.toLowerCase() === "wakanda") {
			eggtype = guess.toLowerCase();
			launchEasteregg(eggtype);
		}
		
		computerSaysNo();	
	}
	
	else {
		if (countryobj.guessed === true) {
			alreadyGuessed();
		}
		
		else {			
			correctCount = correctCount +1;
			
			if (correctCount < goalCount) {
				celebrateGuess();
			}
			
			// update countrylist to make sure country cannot be guessed twice
			countrylist.find(obj => obj.accepted.includes(guess.toLowerCase())).guessed = true;
			
			updateCounter(correctCount);
			updateSuccessList(countryobj.canonical);
			
			if (correctCount === goalCount) {
				allguesses.push(guess);
				gameSuccess()
			}					
		}
	}

	// save guess to array of all guesses	
	allguesses.push(guess);
	
}


// update counter

function updateCounter() {
	$('#correctCount').html(correctCount);
}

// add good guess to list

function updateSuccessList(guess) {
	$('#correctcountries').prepend(guess + "﹒");
	guessedcountries.push(guess);
}

// flash background green and empty input field when guess is correct
function celebrateGuess() {
    $("body").toggleClass("goodguess");
    setTimeout(function(){ 
    	$("body").toggleClass("goodguess"); 
    }, 2000);
    document.getElementById('userguess').value = "";
}

// flash background yellow and empty input field when guess is duplicate
function alreadyGuessed() {
    $("body").toggleClass("duplicateguess");
    setTimeout(function(){ 
    	$("body").toggleClass("duplicateguess"); 
    }, 2000);
    document.getElementById('userguess').value = "";	
}

// flash background red when guess is wrong
function computerSaysNo() {
    $("body").toggleClass("badguess");
    
    if (feedbackHint === false) {
    feedbackHint = true;
    $("#feedbackhint").removeClass("hidden");
    }
    
    setTimeout(function(){ 
    	$("body").toggleClass("badguess"); 
    }, 2000);	
}

//******* game end functions ********************

// when game ends successfully, i.e. goal count reached
function gameSuccess() {

	// stop timer
	stopTimer();
	
	// update key variable
	knowAfrica = true;
	
	// final flash
 	$("body").addClass("gamesuccess");
 	
 	// remove focus of input field (to hide keyboard on mobile)
 	$('#userguess').blur();
	
	//add delay
	setTimeout(function(){ 
    	
    	// hide and reveal stuff with select and toggle hidden
		aftergameElements();
		successElements();
	
    }, 1000);
    
    // change logo
    $("#logo").html("Oh, you do know Africa!");
	
	// create endmessage
	endMessage();
		
	// create sharing stuff
    updateTwitterLink();
    updateFacebookLink();
    updateWhatsappLink();
    updateEmailLink();
    
    // save all guesses to DB
    saveGuessesToDB();

}

// when game fails, i.e. time runs out or user gives up
function gameFail(reason) {
	
	// create endmessage
	endMessage();
	
	// hide and reveal stuff
	aftergameElements()
	
	// remove focus of input field (to hide keyboard on mobile)
 	$('#userguess').blur();
	
	// calculate missed countries
	missedcountriesobj = countrylist.filter(obj => obj.guessed === false);
	
	for (i = 0; i < missedcountriesobj.length;i++) {
		missedcountries.push(missedcountriesobj[i]["canonical"]);
	}
	
	missedcountries = missedcountries.sort()
	
	missedcountries = missedcountries.join(", ")
		
	// show missed countries to user	
	$("#missedcountries p").append(missedcountries + ".");
		
	
	// create sharing stuff
    updateTwitterLink();
    updateFacebookLink();
    updateWhatsappLink();
    updateEmailLink();
    
    // show fail specific elements
	failElements();

	
	// save all guesses to DB
	saveGuessesToDB()
}


//******* timer functions ********************

function getTimer() {
  if (!timerStopped) {
    var time = new Date().getTime();
  } else {
    var time = finalTime;
  }

  var elapsedTime = Math.floor((time - startTime) / 100);

  var seconds = Math.floor(elapsedTime / 10) % 60;
  if (seconds < 10) {
    seconds = '0' + seconds;
  }

  var minutes = Math.floor(elapsedTime / 600);
  
  if (elapsedTime >= maxTime - 150 && timerAlert === false) {
	  timerAlert = true;
	  $('.timer').addClass("alert");
  }

  
  if (elapsedTime >= maxTime && timeOver === false) {
	  timeOver = true;
	  stopTimer();
	  gameFail("timeout");
  }
  
  else {
	return minutes + ':' + seconds;
  }
  
}

function updateTimer() {
  var timeHtml = getTimer();

  var els = document.querySelectorAll('.timer');
  for (var i = 0, el; el = els[i]; i++) {
    el.innerHTML = timeHtml;
  } 
}

function stopTimer() {
  timerStopped = true;
  finalTime = new Date().getTime();
  window.clearInterval(timerIntervalId);  

  updateTimer();
}


//******* goodbye functions ********************

// create endmessage based on difficulty and success
function endMessage() {

	if (knowAfrica === true) {
		// use text already in DOM
	}
	
	else {
		
		if (gameDifficulty === "easy") {
		
			if (correctCount === 19) {
				text = "Almost. Just one more. Next time you'll make it."	
			}
			
			else if (correctCount >= 17) { // 17-18
				text = "You got " + correctCount + " out of " + goalCount + ". So close."	
			}
			
			else if (correctCount >= 15) { // 15-16
				text = correctCount + " out of " + goalCount + ". Very good. Still a couple missing."
			}
			
			else if (correctCount >= 10) { // 10-14
				text = correctCount + " out of " + goalCount + ". Not great, not terrible."
			}
			
			else if (correctCount >= 7) { // 7-9
				text = correctCount + " out of " + goalCount + ". You can do better, no?"
			}
	
			else { // less than 7
				text = "Ok, that was embarrassing. Let's try this again, shall we?"
			}
				
		}
		
		if (gameDifficulty === "hard") {
		
			
			if (correctCount === 53) {
				text = "Almost. Just one more. Next time you'll make it."	
			}
			
			else if (correctCount >= 48) { // 48-52
				text = "You got " + correctCount + " out of " + goalCount + ". So close."	
			}
			
			else if (correctCount >= 35) { // 35-47
				text = correctCount + " out of " + goalCount + ". Very good. Still a couple missing."
			}
			
			else if (correctCount >= 25) { // 25-34
				text = correctCount + " out of " + goalCount + ". Really good. But not even close to all."
			}
			
			else if (correctCount >= 15) { // 15-24
				text = correctCount + " out of " + goalCount + ". Not great, not terrible."
			}
		
			else if (correctCount >= 7) { //7 -14
				text = correctCount + " out of " + goalCount + ". You can do better, no?"
			}
	
			else { // less than 7
				text = "Ok, that was embarrassing. Let's try this again, shall we?"
			}
				
		}
		
		$("#endmessage p").html(text);
		
	}
	
}


//******* sharing functions ********************


// create sharing text based on success or fail
function getSharingMessage() {
  if (knowAfrica) {
  return 'I just played #YouStillDontKnowAfrica and named ' + 
      goalCount + ' African countries from memory in ' + getTimer() + '. Can you do better?';
      }
  else {return 'I just played #YouStillDontKnowAfrica and managed to name ' + correctCount + ' African countries from memory. Can you do better?';}
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
      '&url=' + encodeURIComponent(shareUrl) + '&via=davidbauer';

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

//******* hide and show elements based on game state ********************

function aftergameElements() {
	$('.ingame').addClass('hidden');
	$("#feedbackhint").addClass("hidden");
	$('.aftergame').removeClass('hidden');
}

function failElements() {
	$('.aftergamefail').removeClass('hidden');
}

function successElements() {
	$('.aftergamesuccess').removeClass('hidden');
	if (gameDifficulty === "hard") {
		$('.redo-button').html("Try even faster");
	}
}


function reloadPage() {
  location.reload();
}

//******* save data to and retrieve data from firebase ********************

function saveGuessesToDB() {
	 guessesDB.push(allguesses);
}

function logPlays() {
 	if (numberOfPlays > 1) { // this prevents updating the database if numberOfPlays isn't loaded correctly
 		myDataRef.set({plays: numberOfPlays+1});
 	}
}

//******* eastereggs because everything is more fun with them ********************

function launchEasteregg(eggtype) {
		
	$('.easteregg').append('<img src="images/easter-' + eggtype + '.png">');
	$('.easteregg').addClass('easteregg-active');
			
	setTimeout(function(){ 
		$('.easteregg').removeClass('easteregg-active');
		$('.easteregg').html(""); 
	}, 2000);

	
}



// it's the end of the code as we know it