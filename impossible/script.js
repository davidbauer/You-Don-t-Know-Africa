/* todo

- get rid of timer function duplicate

*/

var countrylist;

var goalCount = 54;
var correctCount = 0;

var partOneSuccess = false;

var numberOfPlays;
var numberOfFinishers;

var missedcountries = [];
var guessedcountries = [];

var startTime = 0;
var timeOver = false;
var timerIntervalId;
var finalTime = null;
var timerStopped = false;
var partOneTime = 0;

var feedbackHint = false;


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
		
	$.getJSON("countries-en.json", function(json) {
    countrylist = json;
	});
	
}

// make everything ready when user clicks start
function startPartOne() {
		
	// hide and reveal stuff
	$('.pregame').addClass('hidden');
	$('.ingame').removeClass('hidden');
	$('.season').removeClass('shake');
	
	// focus input field so the user can start typing right away (fallback in case autofocus attr doesn't work)
	$('#userguess').focus();
		
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
    }, 5000);
	
	
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
				gameSuccess()
			}					
		}
	}
	
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
	partOneSuccess = true;
	
	// add scripts for part 2
	addScripts();
	 	
 	// remove focus of input field (to hide keyboard on mobile)
 	$('#userguess').blur();
	
	//add delay
	setTimeout(function(){ 
    	
    	// hide and reveal stuff with select and toggle hidden
		aftergameElements();
		successElements();
	
    }, 1000);
	
	// create endmessage
	endMessage();

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
		    
    // show fail specific elements
	failElements();


}


//******* timer functions ********************

function getTimer() {
  if (!timerStopped) {
    var time = new Date().getTime();
  } else {
    var time = finalTime;
	partOneTime = finalTime - startTime;
  }

  var elapsedTime = Math.floor((time - startTime) / 100);

  var seconds = Math.floor(elapsedTime / 10) % 60;
  if (seconds < 10) {
    seconds = '0' + seconds;
  }

  var minutes = Math.floor(elapsedTime / 600);
 
  return minutes + ':' + seconds;
  
  
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

	if (partOneSuccess === true) {
		// use text already in DOM
	}
	
	else {	
			
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

		
		$("#endmessage p").html(text);
		
	}
	
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

}


function reloadPage() {
  location.reload();
}

//******* play stats ********************

function logPlays() {
 	if (numberOfPlays > 0) { // this prevents updating the database if numberOfPlays isn't loaded correctly
 		playsDB.set({plays: numberOfPlays+1});
 	}
}

function retrieveData() { 
	playsDB.on("value", function(snapshot) {
	  
	  data = snapshot.val();
	  numberOfPlays = data['plays'];
	  $('.noOfPlays').text(numberOfPlays);

	}, function (errorObject) {
	  console.log("The read failed: " + errorObject.code);
	});
	
	finishersDB.on("value", function(snapshot) {
	  
	  data = snapshot.val();
	  if (data !== null) {
	  numberOfFinishers = Object.keys(data).length;
	  $('.noOfFinishers').text(numberOfFinishers);
	  }

	}, function (errorObject) {
	  console.log("The read failed: " + errorObject.code);
	});
	
};


//******* hand over to part two ********************

function preparePartTwo() {
	$("#part-one").html("");
	$("#part-two").removeClass('hidden');
 	main();
}

function addScripts() {
	
	scriptnames = ['d3.v3.min.js','queue.v1.min.js','topojson.v0.min.js','modernizr.js','scripts.js','data.js']
	
	for (i = 0;i<scriptnames.length;i++) {
		const script = document.createElement("script");
		script.type = "text/javascript";
		script.src = "public/js/" + scriptnames[i];
		document.head.appendChild(script);	
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