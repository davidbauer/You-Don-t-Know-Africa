var countrylist;
var guessesraw;
var flattenedguesses = [];
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
	
	$.getJSON("countries-simple.json", function(json) {
    countrylist = json;
	});
	
}

// load and save list of guesses
function loadGuesses() {
		
	$.getJSON("stats/guesses-export-test.json", function(json) { // add -test to json name for testing
    guessesraw = json;
    
    loopThrough();
        
/*
    // UNCOMMENT TO GENERATE NEW RESULTS IF NEW JSON FILE ADDED 
	loopThrough();
    
    console.log("all calculations done");
    
    //displayResults();
    resultsToConsole();
*/
    

    	
    	
	});
	

	
}


function download(content, fileName, contentType) {
    var a = document.createElement("a");
    var file = new Blob([content], {type: contentType});
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
}

function loopThrough() {
	
	console.log("crunching numbers...");
	
	for (const property in guessesraw) {
		
		console.log(guessesraw[property]);
		
		obj = {};
		obj['country'] = guessesraw[property]['country'];
		obj['correct'] = guessesraw[property]['correct'];
		
		
		flattenedguesses.push(obj);
		
				
// 		console.log(answer['country']);
		
// 		console.log(`${property}: ${guessesraw[property]}`);
	}
	
	
	
	
/*
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
*/
	
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
