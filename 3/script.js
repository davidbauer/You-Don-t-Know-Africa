/*
TODO:
- improve flag styling
- teaser image ydka.com
- implement testing based on finish time
*/


var countrylist;

var goalCount = 20;
var correctCount = 0;

var knowAfrica = false;
var gameDifficulty;

var numberOfPlays;

var currentguess; 
var toBeGuessed = []; 
var allguesses = [];

var startTime = 0;
var timeOver = false;
var timerIntervalId;
var finalTime = null;
var timerStopped = false;
var timerAlert = false;

var feedbackHint = false;

var shareUrl = "https://www.youdontknowafrica.com/3";
var FACEBOOK_APP_ID = '777235462302407';
var FB_PICTURE = 'https://youdontknowafrica.com/3/images/teaser-sequel.png';



$(function() {
	
	// load country data
	loadCountries();
	
	// load plays stats from firebase
 	retrieveData();
			
});


//******* setting up functions ********************

//activate testing mode
function startTesting() {
	$('.testing').removeClass('hidden');
}


// load and save list of countries
function loadCountries() {
	
	console.log("loading countries json");
	
	$.getJSON("countries-simple.json", function(json) {
    countrylist = json;
	});
	
}

// get current plays number from firebase
function retrieveData() { 
	myDataRef.on("value", function(snapshot) {
	  
	  data = snapshot.val();
	  numberOfPlays = data['plays'];
	  console.log(numberOfPlays + " plays so far");

	}, function (errorObject) {
	  console.log("The read failed: " + errorObject.code);
	});
	
};

// make everything ready when user clicks start
function startGame(difficulty) {
	
	$(".cover").removeClass("cover");
	
	gameDifficulty = difficulty;
	
	// hide and reveal stuff
	$('.pregame').addClass('hidden');
	$('.ingame').removeClass('hidden');
	
	// create array of flags to guess
	toBeGuessed = shuffle(countrylist.slice()); // the .slice() is needed to actually clone countrylist rather than adding a reference
	if (gameDifficulty == "easy") {
		toBeGuessed = toBeGuessed.splice(0,20);
	}
		
	// adjust settings to hard mode
	if (difficulty === "hard") {
		goalCount = 54;
		$("#intro").html("Identify all African country flags, as fast as you can")
	} 
	
	$('#goalCount').html(goalCount);
	
	// start timer
	startTime = new Date().getTime();
	updateTimer();
	window.setTimeout(function() {
    startTime = new Date().getTime();
    timerIntervalId = window.setInterval(updateTimer, 100);
	}, 500);
	
	// update play count in database once 3 secs are played

	setTimeout(function(){ 
    	logPlays(); 
    }, 3000);

    
    // prepare first question
    
    prepareQuestion();
		
}

// shuffle array (Fisher-Yates shuffle)

function shuffle(array) {
  let currentIndex = array.length,  randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}

//******* prepare questions ********************

function prepareQuestion() {
	
	//clean dom
	$('.answeroptions').html("");
		
	//save country item for later
	currentguess = toBeGuessed[0];
		
	//flag
/* emoji version
	thisflag = toBeGuessed[0].flagemoji
	$('.flagtoguess').html(thisflag);
*/	
	thisflag = "images/flags/" + toBeGuessed[0].iso + ".png";
	$('.flagtoguess').html("<img src='"+ thisflag + "' />");
	
	//answers
	
	answeroptions = [];
	
	correctanswer = toBeGuessed[0].name;
		
	answeroptions.push(correctanswer);
	
	// add three more (wrong) answer options
	while (answeroptions.length < 4) {
		
		var pick;
		
		// add some easteregg fun
		
		if (Math.random() > 0.99) { // with a 1:100 chance, pick an easteregg as one of the answers
			
			Math.random() > 0.5 ? pick = "Nambia" : pick = "Wakanda";
		
		}
		
		else {
			var pos = Math.floor(Math.random() * countrylist.length);
			pick = countrylist[pos].name;
		}
		
		answeroptions.indexOf(pick) === -1 ? answeroptions.push(pick) : console.log("");
	}
		
	answeroptions = shuffle(answeroptions);
		
	// add answers to dom	
	for (const answer of answeroptions) {
		if (answer == correctanswer) {
			$('.answeroptions').append("<div class='answeroption' data-solution='correct' onclick='validateAnswer(true)'>"+ answer + "</div>");
		}
		
		else if (answer == "Nambia" || answer == "Wakanda") {
			$('.answeroptions').append("<div class='answeroption' data-solution='wrong' onclick='validateAnswer(false);launchEasteregg(\"" + answer + "\");'>"+ answer + "</div>");
		}
		
		else {
			$('.answeroptions').append("<div class='answeroption' data-solution='wrong' onclick='validateAnswer(false)'>"+ answer + "</div>");
		}
	}
	
	// remove country from array (if user selects wrong answer, we'll re-add it at the end of the array
	toBeGuessed.shift();
		
}

//******* user input functions ********************

// check if user input is correct

function validateAnswer(solution) {
		
	guessesDB.push({"country": currentguess.name, "correct": solution}); // save every guess in DB in case user gives up
	allguesses.push({"country": currentguess.name, "correct": solution}); // save locally and save entire game in DB after user completes it
		
	if (solution == true) {
				
		correctCount = correctCount +1;
					
		if (correctCount < goalCount) {
				celebrateGuess();
				// go to next question
	
				setTimeout(function(){ 
			    	prepareQuestion(); 
			    }, 200);
		}
						
		updateCounter(correctCount);
					
		if (correctCount === goalCount) {
				gameSuccess();
		}
		
	}	

	else {
		
		computerSaysNo();
		
		// we re-add the flag so it comes again at the end
		toBeGuessed.push(currentguess)
		
		// go to next question
	
		setTimeout(function(){ 
	    	prepareQuestion(); 
	    }, 500);
		
	}				
	
}


// update counter

function updateCounter() {
	$('#correctCount').html(correctCount);
}

// flash background green guess is correct
function celebrateGuess() {
    $("body").toggleClass("goodguess");
    setTimeout(function(){ 
    	$("body").toggleClass("goodguess"); 
    }, 2000);
}

// flash background red when guess is wrong
function computerSaysNo() {
    $("body").toggleClass("badguess");
    
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
	
	//add delay
	setTimeout(function(){ 
    	
    	// hide and reveal stuff to create end screen
		aftergameElements();
	
    }, 1000);
	
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

	usertime = (finalTime - startTime) / 1000 // time user needed to complete the game, in seconds
		
	if (gameDifficulty === "easy") {
	
		if (usertime < 30) {
			$("#logo").html("Oh, you do know Africa!");
			text = "Blazing fast. You should try the hard mode with all 54 flags."
			$(".redo-button").text("Try hard mode");	
		}
		
		else if (usertime < 60) { 
			text = "Impressive. Can you still go faster?"
			$(".redo-button").text("Try again");	
		}
		
		else if (usertime < 90) { 
			text = "Not too bad. But you could do faster, couldn't you?"
			$(".redo-button").text("Try again");	
		}
		
		else if (usertime < 180) { 
			text = "You made it. Barely."
			$(".redo-button").text("Try again");	

		}

		else { // more than 3 minutes
			text = "Ok, that was a little embarrassing. Let's try this again, shall we?"
			$(".redo-button").text("Try again");	

		}
			
	}
	
	if (gameDifficulty === "hard") {
	
		
		if (usertime < 180) { // less than 3 mins
			$("#logo").html("Oh, you do know Africa!");
			text = "My respect. You really do know African flags."
			$(".redo-button").text("Try even faster");	
	
		}
		
		else if (usertime < 240) {  // less than 4 mins
			$("#logo").html("Oh, you do know Africa!");
			text = "Fairly quick. Congratulations";
			$(".redo-button").text("Try again");	
	
		}
		
		else if (usertime < 360) { // less than 6 mins
			text = "You took your time, but you made it to the end. Congratulations."
			$(".redo-button").text("Try again");	

		}
		
		else { // more than 6 mins
			text = "Hm, maybe try that again a little faster..."
			$(".redo-button").text("Try again");	

		}
			
	}
	
	$(".endtxt").html(text);
	
}


//******* sharing functions ********************


// create sharing text 

function getSharingMessage() {
  
  return 'I just played #YouDontKnowAfrica and identified the flags of ' + 
      goalCount + ' African countries in ' + getTimer() + '. Can you do better?';
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

function reloadPage() {
  location.reload();
}

//******* save data to and retrieve data from firebase ********************

function saveGuessesToDB() {
	 gamesDB.push(allguesses);
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