var countrylist;
var guessesraw;
var numberOfCorrects = [];
var percentOfCorrects = [];
var successes = [];
var plays = 0;
var successPlays = 0;
var completePlays = 0;
var failWorst = 0;
var failWorse = 0;
var failBad = 0;
var failGood = 0;
var nambiaCount = 0;
var wakandaCount = 0;
var others = [];
var countryexport = [];


$(function() {
	loadCountries();
	loadGuesses();
});


// load and save list of countries
function loadCountries() {
	
	$.getJSON("countries.json", function(json) {
    countrylist = json;
	});
	
}

// load and save list of guesses
function loadGuesses() {
		
	$.getJSON("stats/guesses-export.json", function(json) { // add -test to json name for testing
    guessesraw = json;
    console.log("# of attempts imported: " + guessesraw.length);
    
/*
    
    // UNCOMMENT TO GENERATE NEW RESULTS IF NEW JSON FILE ADDED 
	loopThrough();
    
    console.log("all calculations done");
    
    //displayResults();
    resultsToConsole();
    
*/
    	
    	
	});
	

	
}


function loopThrough() {
	
	console.log("crunching numbers...");
	
	for (i = 0; i < guessesraw.length; i++) { // loop through all play records in the json
		
		plays++;
		
		var guesses = Object.values(guessesraw[i])[0];
		
		// remove duplicates
		uniqueGuesses = [];
		$.each(guesses, function(i, el){
			if($.inArray(el, uniqueGuesses) === -1) uniqueGuesses.push(el);
		});
		
		// make copy of countrylist to validate against
		var countrylistCopy = JSON.parse(JSON.stringify(countrylist));
				
		correctcount = 0;
			

		for (j = 0; j < uniqueGuesses.length; j++) { // loop through all guesses in that play record
	
			// validate guesses		
			validateCountry(uniqueGuesses[j], countrylistCopy);
		}
		
		// ugh
		if (i < 6530 && (correctcount === 19 || correctcount === 53 )) {
			correctcount = datafix(correctcount);
		}
		
		
		//console.log("correct: " + correctcount + "/" + guesses.length);
		numberOfCorrects.push(correctcount);
		percentOfCorrects.push(correctcount/uniqueGuesses.length);
		
		if (correctcount === 20) {
			successes.push(true);
			successPlays++;	
		}
		
		else if (correctcount === 54) {
			successes.push(true);
//			successPlays++;
			completePlays++;
			
		}
		
		else {
			successes.push(false);
			
			if (correctcount <= 5) {
				failWorst++;
			}
			
			else if (correctcount <= 10) {
				failWorse++;
			}
			
			else if (correctcount < 20) {
				failBad++;
			}
			
			else { // all attemps with more than 20 but less than 54 correct ones
				//console.log(correctcount);
			}
			
			
		}
		
	}
	
}

function validateCountry(guess, validationfile) {
			
	countryobj = validationfile.find(obj => obj.accepted.includes(guess.toLowerCase()))
		
	if (countryobj === undefined) {
		
		if (guess.toLowerCase() === "nambia") {
			nambiaCount++;
		}
		
		else if (guess.toLowerCase() === "wakanda") {
			wakandaCount++;
		}
		
		else {
			others.push(guess.toLowerCase()); // save all other guesses
		}
		
	}
	
	else {			
		
		// check if already checked off == guessed = true
		if (countryobj.guessed === true) {
			// do nothing
		}
		
		else {
			correctcount = correctcount+1;	
			
			// update validationfile to make sure country cannot be counted as guessed twice
			validationfile.find(obj => obj.accepted.includes(guess.toLowerCase())).guessed = true;
			
			// increase global count for that country
			countrylist.find(obj => obj.accepted.includes(guess.toLowerCase())).count++;
		
		}
				
	}
	
	
}

function displayResults() {
	$('.attempts').text(plays);
	/* only calculate after adding new json, then hardcode for speed
$('.completed').text(completePlays);
	$('.successes').text(Math.round(successPlays/plays*100) + "%");
	$('.fail-bad').text(Math.round(failBad/plays*100) + "%");
	$('.fail-worse').text(Math.round(failWorse/plays*100) + "%");
	$('.fail-worst').text(Math.round(failWorst/plays*100) + "%");
*/
	$('.nambia').text(nambiaCount);
	$('.wakanda').text(wakandaCount);
	countriesByGuesses(); // only calculate after adding new json, then hardcode for speed
}

function resultsToConsole() {
	console.log("attempts: " + plays);
	console.log("54 correct: " + completePlays);
	console.log("20 correct: " + Math.round(successPlays/plays*100) + "%");
	console.log("11-19 correct: " + Math.round(failBad/plays*100) + "%");
	console.log("10 or less correct: " + Math.round(failWorse/plays*100) + "%");
	console.log("5 or less correct: " + Math.round(failWorst/plays*100) + "%");
	console.log("Nambia guesses: " + nambiaCount);
	console.log("Wakanda guesses: " + wakandaCount);
	console.log(others);	
}


function countriesByGuesses() {

	countrylist.sort(function(a, b){
    return b.count-a.count
})
	
	for (i=0; countrylist.length;i++) {
		
		var number = Math.round(countrylist[i].count/plays*100);
		
		// change drc to generic "congo" to account for people who entered congo but thought of rotc
		if (countrylist[i].canonical === "Democratic Republic of the Congo") {
			countrylist[i].canonical = "Congo<sup>*</sup>"
		}
		
		if (countrylist[i].canonical === "Republic of the Congo") {
			countrylist[i].canonical = "Republic of the Congo<sup>*</sup>"
		}
		
		$('.countrybreakdown table').append("<tr class='pct-" + number + "'><td class='cb-c'>" + countrylist[i].canonical + " " + countrylist[i].flag + "</td><td class='cb-v'><span>" + "•".repeat(number) + "</span> " + Math.round(number) + "%</td></tr>");
		
		countryexport.push(countrylist[i].canonical + "," + Math.round(number));
	}
}


function getMedian(array) {
  array = array.sort();
  if (array.length % 2 === 0) { // array with even number elements
    return (array[array.length/2] + array[(array.length / 2) - 1]) / 2;
  }
  else {
    return array[(array.length - 1) / 2]; // array with odd number elements
  }
};

function getMean(array) {
  
  var sum = function(array) {
  var total = 0;
  for (var i=0; i<array.length; i++) {
    total += array[i];
  }
  return total;
};
  
  var arraySum = sum(array);
  return arraySum / array.length;
};


// this is to correct a stupid mistake in data gathering (for the first 6530 attempts, the last country wasn't logged when the game ended successfully. I assume that for 9 in 10 cases 19 correct guesses actually means 20, and for 19 in 20 cases, 53 actually means 54.

function datafix(correctcount) {
	
	rand = Math.random();

	if (correctcount === 19) {
		if (rand < 0.90) {
			return correctcount+1;
		}
		else {
			return correctcount;
		}
	}

	else if (correctcount === 53) {	
		if (rand < 0.95) {
			return correctcount+1;	
		}
		else {
			return correctcount;
		}
	}
		
}


// fails when array too big? alternative: copy(arrayname.join('\n'))
function csvExport(array) { 


	let csvContent = "data:text/csv;charset=utf-8,";
	
	for(i=0;i < array.length;i++) {
		csvContent += array[i] + "\r\n";
	}
	
	
	console.log(csvContent)
	
	copy(array.join('\n'))
	console.log("array content copied to clipboard")
	
	var encodedUri = encodeURI(csvContent);
	window.open(encodedUri);

}

function revealMoreStats() {
	$('#morestats').removeClass('hidden');
	$('.revealbutton').addClass('hidden');
	
}
