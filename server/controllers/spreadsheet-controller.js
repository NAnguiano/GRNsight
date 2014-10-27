var multiparty = require('multiparty'),
    xlsx = require('node-xlsx'),
    util = require('util'),
    path = require('path');

    processGRNmap = function (path, res, app) {
      var sheet,
          currentSheet,
          network = {
            genes: [],
            genePairs: [],
            links: [],
            errors: [],
            positiveWeights: [],
            negativeWeights: [],
          },
          currentLink,
          currentGene,
          currentGenePair,
          errorArray = [];

      try {
        sheet = xlsx.parse(path);
      } catch (err) {
        return res.json(400, "Unable to read input. The file may be corrupt.");
      }

      // For the time being, send the result in a form readable by people
      //TODO: Optimize the result for D3
      res.header('Access-Control-Allow-Origin', app.get('corsOrigin'));
      //Look for the worksheet containing the network data
      for (var i = 0; i < sheet.worksheets.length; i++) {
        if (sheet.worksheets[i].name == "network") {
          //Here we have found a sheet containing simple data. We keep looking
          //in case there is also a sheet with optimized weights
          currentSheet = sheet.worksheets[i];
        } else if (sheet.worksheets[i].name == "network_optimized_weights") {
          //We found a sheet with optimized weights, which is the ideal data source.
          //So we stop looking.
          currentSheet = sheet.worksheets[i];
          break;
        }
      }

      if(currentSheet === undefined) {
        // because no possible errors (currently) can occur before this, we'll just return the fatal error.
        // TO DO: Fix this.  
        return res.json(400, "This file does not have a 'network' sheet or a 'network_optimized_weights' sheet. Please select another" + 
          " file, or rename the sheet containing the adjacency matrix accordingly. Please refer to the " + 
          "<a href='http://dondi.github.io/GRNsight/documentation.html#section1' target='_blank'>Documentation page</a> for more information.");
      }
      
      for (var j = 1; j < currentSheet.data[0].length; j++) {
        try {
          try {
            currentGene = {name: currentSheet.data[0][j].value}
            currentGenePair = {name: currentSheet.data[j][0].value}
          } catch (err) { 
            return res.json(400, "One of your gene names appears to be corrupt. Please fix the error and try uploading again.");
          }
          network.genes.push(currentGene);
          network.genePairs.push(currentGenePair);
        } catch (err) {
          network.errors.push(err.message);
        }
        for(var k = 1; k < currentSheet.data[j].length; k++) {
          try {
            if (currentSheet.data[j][k].value != 0) {
              currentLink = {source: k - 1, target: j - 1, value: currentSheet.data[j][k].value};
              if (currentLink.value > 0) {
                currentLink.type = "arrowhead";
                currentLink.stroke = "MediumVioletRed";
                network.positiveWeights.push(currentLink.value);
              } else {
                currentLink.type = "repressor";
                currentLink.stroke = "DarkTurquoise";
                network.negativeWeights.push(currentLink.value);
              }
              network.links.push(currentLink);
            }
          } catch (err) {
            network.errors.push(err.message);
          }
        }
      }

      var genesArray = [];
      var genePairsArray = [];
      for(var i = 0; i < network.genes.length; i++) {
        genesArray[i] = network.genes[i].name;
        genePairsArray[i] = network.genePairs[i].name;
      }
      genesArray.sort();
      genePairsArray.sort();

      // Have these return true/false
      var checkErrors = [
        checkDuplicates, 
        checkGenePairs, 
        checkGeneLength
      ];
      for(var i = 0; i < checkErrors.length; i++) {
        checkErrors[i](errorArray, genesArray, genePairsArray);
      }

      if(errorArray.length != 0) {
        var errorString = "Your graph failed to load.<br /><br />";
        for(var i = 0; i < errorArray.length; i++) {
          errorString += errorArray[i].possibleCause + " " + errorArray[i].suggestedFix + "<br /><br />";
        }
        return res.json(400, errorString);
      } else {
        return res.json(network);
      }
    };

    newError = function(possibleCause, suggestedFix) {
      this.possibleCause = possibleCause;
      this.suggestedFix = suggestedFix;
    }

    checkDuplicates = function(errorArray, genesArray, genePairsArray) {
      for(var i = 0; i < genesArray.length - 1; i++) {
        if(genesArray[i] === genesArray[i+1]) {
          errorArray.push(new newError("There exists a duplicate for gene " + genesArray[i] + " along the top. Please note this may cause many genes to be shown as not matching. ", "Please remove the duplicate gene and submit again. "))
        }
        if(genePairsArray[i] === genePairsArray[i+1]) {
          errorArray.push(new newError("There exists a duplicate for gene " + genePairsArray[i] + " along the side. Please note this may cause many genes to be shown as not matching. ", "Please remove the duplicate gene and submit again. "))
        }
      }
    }

    checkGenePairs = function(errorArray, genesArray, genePairsArray) {
      for(var i = 0; i < genesArray.length; i++) {
        if(genesArray[i] != genePairsArray[i]) {
          errorArray.push(new newError("Genes " + genesArray[i] + " and " + genePairsArray[i] + " are not an exact match. ", "Make sure the names match and submit again. "));
        }
      }
    }

    checkGeneLength = function(errorArray, genesArray, genePairsArray) {
      for(var i = 0; i < genesArray.length; i++) {
        if(genesArray[i].length > 12) {
          errorArray.push(new newError("Gene " + genesArray[i] + " is more than 12 characters in length. ", "Genes may only be between 1 and 12 characters in length. Please shorten the name and submit again. "));
        }
        if(genePairsArray[i].length > 12) {
          errorArray.push(new newError("Gene " + genePairsArray[i] + " is more than 12 characters in length. ", "Genes may only be between 1 and 12 characters in length. Please shorten the name and submit again. "));
        }
      }
    }

module.exports = function (app) {
  //parse the incoming form data, then parse the spreadsheet. Finally, send back json.
  app.post('/upload', function (req, res) {
    //TODO: Add file validation
    (new multiparty.Form()).parse(req, function (err, fields, files) {
      if (err) {
        return res.json(400, "There was a problem uploading your file. Please try again.");
      }

      try {
        var input = files.file[0].path;
      } catch (err) {
        return res.json(400, "No upload file selected.");
      }

      if (path.extname(input) !== ".xlsx") {
        return res.json(400, "Invalid input file. Please select an Excel Workbook (*.xlsx) file." +
          "<br><br>Note that Excel 97-2003 Workbook (*.xls) files are not able to be read by GRNsight.");
      }

      return processGRNmap(input, res, app);
    });
  });

  app.get('/demo/unweighted', function (req, res) {
    return processGRNmap("../test-files/Demo\ Files/21-genes_50-edges_Dahlquist-data_input.xlsx", res, app);
  });

  app.get('/demo/weighted', function (req, res) {
    return processGRNmap("../test-files/Demo\ Files/21-genes_50-edges_Dahlquist-data_estimation_output.xlsx", res, app);x
  });

  app.get('/demo/schadeInput', function (req, res) {
    return processGRNmap("../test-files/Demo\ Files/21-genes_31-edges_Schade-data_input.xlsx", res, app);
  });

  app.get('/demo/schadeOutput', function (req, res) {
    return processGRNmap("../test-files/Demo\ Files/21-genes_31-edges_Schade-data_estimation_output.xlsx", res, app);
  });
}