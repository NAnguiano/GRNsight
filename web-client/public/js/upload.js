$(function () {
  var currentNetwork = null;
  var reloader = function () { };

  // Style of the tooltips when the user mouses over the label names
  $(".info").tooltip({
    placement: "top",
    delay: { show: 700, hide: 100 }
  });

  // Defaults the sliders so that they return to their default values when the page is refreshed
  $( "#linkDistInput" ).val(500);
  $( "#chargeInput" ).val(-1000);
  $( "#chargeDistInput" ).val(1000);
  $( "#gravityInput" ).val(0.1);

  var displayNetwork = function (network, name) {
    currentNetwork = network;
    console.log(network); // Display the network in the console
    $("#graph-metadata").html(network.genes.length + " nodes<br>" + network.links.length + " edges");

    if (network.warnings.length > 0) {
      displayWarnings(network.warnings);
    }

    $("#fileName").text(name); // Set the name of the file to display in the top bar
    $("input[type='range']").off("input"); // I have no idea why I do this. Investigate later.

    // If more things need to be turned off, we'll add them to this array
    [ "#resetSliders", "#resetSlidersMenu", "#undoReset", "#undoResetMenu" ].forEach(function (selector) {
      $(selector).off("click");
    });

    drawGraph(network.genes, network.links, network.positiveWeights, network.negativeWeights, {
      linkSlider: "#linkDistInput",
      chargeSlider: "#chargeInput",
      chargeDistSlider: "#chargeDistInput",
      gravitySlider: "#gravityInput",
      resetSliderButton: "#resetSliders",
      resetSliderMenu: "#resetSlidersMenu",
      undoResetButton: "#undoReset",
      undoResetMenu: "#undoResetMenu"
    }, network.sheetType, network.warnings);
  };

  var annotateLinks = function (network) {
    // TODO This duplicates logic that is done on the server side for an .xlsx spreadsheet.
    //      Think of a way to consolidate it. Having discovered this, it seems like this should
    //      be done on the client side because it rearranges data redundantly, for ease of display.
    network.positiveWeights = [];
    network.negativeWeights = [];

    network.links.forEach(function (link) {
      if (network.sheetType === "unweighted" && !link.value) {
        link.value = 1;
      }

      if (link.value > 0) {
        link.type = "arrowhead";
        link.stroke = "MediumVioletRed";
        network.positiveWeights.push(link.value);
      } else {
        link.type = "repressor";
        link.stroke = "DarkTurquoise";
        network.negativeWeights.push(link.value);
      }
    });
  };

  /*
   * Thanks to http://stackoverflow.com/questions/6974684/how-to-send-formdata-objects-with-ajax-requests-in-jquery
   * for helping to resolve this.
   */
  var loadGrn = function (url, name, formData) {
    // The presence of formData is taken to indicate a POST.
    var fullUrl = [ $("#service-root").val(), url ].join("/");
    (formData ?
      $.ajax({
        url: fullUrl,
        data: formData,
        processData: false,
        contentType: false,
        type: "POST",
        crossDomain: true
      }) :
      $.getJSON(fullUrl)
    ).done(function (network, textStatus, jqXhr) {
      displayNetwork(network, name || jqXhr.getResponseHeader('X-GRNsight-Filename'));
      reloader = function () {
        loadGrn(url, name, formData);
      };
    }).error(function (xhr, status, error) {
      var err = JSON.parse(xhr.responseText);
      var errorString = "Your graph failed to load.<br><br>";

      if (!err.errors) { // will be falsy if an error was thrown before the network was generated
        errorString += err;
      } else {
        errorString = err.errors.reduce(function (currentErrorString, currentError) {
          return currentErrorString + currentError.possibleCause + " " + currentError.suggestedFix + "<br><br>";
        }, errorString);
      }

      $("#error").html(errorString);
      $("#errorModal").modal("show");
    });
  };

  // TODO Some opportunity for unification with loadGrn?
  var importGrn = function (uploadRoute, filename, formData) {
    var fullUrl = [ $("#service-root").val(), uploadRoute ].join("/");
    $.ajax({
      url: fullUrl,
      data: formData,
      processData: false,
      contentType: false,
      type: "POST",
      crossDomain: true
    }).done(function (network) {
      annotateLinks(network);
      displayNetwork(network, filename);
      reloader = function () {
        importGrn(uploadRoute, filename, formData);
      };
    }).error(function (xhr, status, error) {
      $("#importErrorMessage").text(xhr.responseText);
      $("#importErrorModal").modal("show");
    });
  };

  var submittedFilename = function ($upload) {
    var path = $upload.val();
    var fakePathCheck = path.search("\\\\") + 1;

    while (fakePathCheck) {
      path = path.substring(fakePathCheck);
      fakePathCheck = path.search("\\\\") + 1;
    }

    return path;
  };

  var createFileForm = function ($upload) {
    var formData = new FormData();
    formData.append("file", $upload[0].files[0]);
    return formData;
  };

  var uploadEpilogue = function (event) {
    if (window.ga) {
      window.ga("send", "pageview", {
        page: "/GRNsight/upload",
        sessionControl: "start"
      });
    }

    $("a.upload > input[type=file]").val("");
    event.preventDefault();
  };

  var uploadHandler = function (uploadRoute, uploader) {
    return function (event) {
      var $upload = $(this);
      var filename = submittedFilename($upload);
      var formData = createFileForm($upload);
      uploader(uploadRoute, filename, formData);
      uploadEpilogue(event);
    };
  };

  $("#upload").on("change", uploadHandler("upload", loadGrn));
  $("#upload-sif").on("change", uploadHandler("upload-sif", importGrn));
  $("#upload-graphml").on("change", uploadHandler("upload-graphml", importGrn));

  var displayWarnings = function (warnings) {
    $("#warningIntro").html("There were " + warnings.length + " warning(s) detected in this file. " + 
      "It is possible that these warnings are the result of extraneous data outside of the matrix, but " + 
      "we recommend you review your file and ensure that everything looks correct. The graph will be loaded, " +
      "but may not look the way it is expected to look. To view the details " + 
      "of the warning(s), please select the dropdown below.");

    $("#warningsList").html(warnings.reduce(function (currentWarningString, currentWarning) {
      return currentWarningString + currentWarning.errorDescription + "<br><br>";
    }, ""));

    $("#warningsModal").modal("show");
  }

  $("#warningsModal").on("hidden.bs.modal", function () {
    if ($("#warningsInfo").hasClass("in")) {
      $("#warningsInfo").removeClass("in");
    }
  });

  $("#reload").click(function (event) {
    if (!$(this).parent().hasClass("disabled")) {
      if ($.isFunction(reloader)) {
        reloader();
      }
    }
  });

  $("#unweighted").click(function (event) {
    loadDemo("demo/unweighted");
  });

  $("#weighted").click(function (event) {
    loadDemo("demo/weighted");
  });

  $("#schadeInput").click(function (event) {
    loadDemo("demo/schadeInput");
  });

  $("#schadeOutput").click(function (event) {
    loadDemo("demo/schadeOutput");
  });

  var loadDemo = function(url) {
    loadGrn(url);
    reloader = function () {
      loadGrn(url);
    };

    $("a.upload > input[type=file]").val("");
  };

  $(".deselectedColoring").click(function (event) {
    colorPreferences(event);
  });

  var colorPreferences = function(event) {
    var deselectedID = "#" + $(".deselectedColoring").attr("id");
    var selectedID = "#" + $(".selectedColoring").attr("id");
    $(deselectedID + ">span").attr("class", "glyphicon glyphicon-ok");
    $(selectedID + ">span").attr("class", "glyphicon invisible");
    // Allows the click handler to swap between the two different options
    $(deselectedID).attr("class", "selectedColoring")
                   .off("click");
    $(selectedID).attr("class", "deselectedColoring")
                 .on("click", colorPreferences);
  };

  // Allow the sliders to be used before loading a graph

  $("input[type='range']").on("input", function() {
    // Due to all of the sliders and their HTML values sharing the same naming convention: NameInput/NameVal, 
    // we can remove the Input and replace it with Val to change the correct HTML value each time.
    var selectedSlider = $(this).attr("id").search("Input");
    var targetID = $(this).attr("id").substring(0, selectedSlider) + "Val";
    var gravityCheck = "";
    if(targetID === "gravityVal"  && $(this).val().length === 3) {
      gravityCheck = "0";
    }
    $("#" + targetID).html($(this).val() + gravityCheck);
  });

  // Handler is unbound first to prevent it from firing twice. 
  // addHanders[0][i] = ID; addHandlers[1][i] = function run when that ID is clicked
  var addHandlers = [ 
    [ "#lockSliders", "#lockSlidersMenu", "#resetSliders", "#resetSlidersMenu", "#undoReset", "#undoResetMenu" ],
    [ lockSliders, lockSliders, resetSliders, resetSliders, undoReset, undoReset]
  ]
  for(var i = 0; i < addHandlers[0].length; i++) {
    $(addHandlers[0][i]).unbind("click").click(addHandlers[1][i]);
  };

  function lockSliders(event) {
    if( $("#lockSlidersMenu").attr("class") === "noGlyph" ) {
      $("#lockSliders").prop("checked", true);
      $("#lockSlidersMenu").removeClass("noGlyph")
                             .html("<span class='glyphicon glyphicon-ok'></span>&nbsp; Lock Force Graph Parameters");
    } else {
      $("#lockSliders").prop("checked", false);
      $("#lockSlidersMenu").addClass("noGlyph")
                           .html("<span class='glyphicon invisible'></span>&nbsp; Lock Force Graph Parameters");
    }
    var check = $("#lockSliders").prop("checked");
    $("input[type='range']").prop("disabled", check);
    $("#resetSliders").prop("disabled", check);
  };
  
  // Enter the prefix of each slider here
  var inputs = [ "#linkDist", "#charge", "#chargeDist", "#gravity" ],
      defaultValues = [500, -1000, 1000, 0.1],
      newValues = [0, 0, 0, 0];

  function resetSliders(event) {
    var check = $( "#lockSliders" ).prop( "checked" );
    if( !check ) {
      newValues = [ $("#linkDistInput").val(), $("#chargeInput").val(), $("#chargeDistInput").val(), $("#gravityInput").val() ];
      for(var i = 0; i < inputs.length; i++) {
        $(inputs[i] + "Input").val(defaultValues[i]);
        if(inputs[i] != "#gravity") {
          $(inputs[i] + "Val").html(defaultValues[i]);
        } else {
          $(inputs[i] + "Val").html(defaultValues[i] + "0"); // add 0 to the end of gravity so that it reads 0.10
        }
      }
      $( "#undoReset" ).prop( "disabled", false );
    }
  };

  function undoReset(event) {
    var check =  $( "#undoReset" ).prop( "disabled" );
    if( !check ) {
      for(var i = 0; i < inputs.length; i++) {
        $(inputs[i] + "Input").val(newValues[i]);
        if(inputs[i] != "#gravity") {
          $(inputs[i] + "Val").html(newValues[i]);
        } else {
          var gravityCheck = ""; 
          if( $("#gravityInput").val().length === 3 ) {
            gravityCheck = "0";
          }
          $(inputs[i] + "Val").html(newValues[i] + gravityCheck); // add 0 to the end of gravity so that it reads 0.10
        }
      }
      $( "#undoReset" ).prop( "disabled", true );
    }
  }
  
  $("#printGraph").click(function (event) {
    if(!$(this).parent().hasClass("disabled")) {
      window.print();
    }
  });

  var flattenNetwork = function (network, sheetType) {
    var result = $.extend(true, { }, network, { sheetType: sheetType });
    result.links.forEach(function (link) {
      link.source = link.source.index;
      link.target = link.target.index;
      delete link.weightElement;
    });
    return result;
  };

  var filenameWithExtension = function (suffix, extension) {
    var filename = $("#fileName").text();
    var currentExtension = filename.match(/\.[^\.]+$/);
    if (currentExtension && currentExtension.length) {
      filename = filename.substr(0, filename.length - currentExtension[0].length);
    }

    if (suffix) {
      filename = filename + "_" + suffix;
    }

    return filename + "." + extension;
  };

  var performExport = function (route, extension, sheetType) {
    return function (event) {
      if (!$(this).parent().hasClass("disabled")) {
        var networkToExport = flattenNetwork(currentNetwork, sheetType);
        var networkFilename = filenameWithExtension(sheetType !== currentNetwork.sheetType ? sheetType : "", extension);
        networkToExport.filename = networkFilename;

        var exportForm = $("<form></form>").attr({
          method: "POST",
          action: $("#service-root").val() + "/" + route
        }).append($("<input></input>").attr({
          type: "hidden",
          name: "filename",
          value: networkFilename
        })).append($("<input></input>").attr({
          type: "hidden",
          name: "network",
          value: JSON.stringify(networkToExport)
        }));
        $("body").append(exportForm);
        exportForm.submit();
        exportForm.remove();
      }
    };
  };

  $("#exportAsUnweightedSif").click(performExport("export-to-sif", "sif", "unweighted"));
  $("#exportAsWeightedSif").click(performExport("export-to-sif", "sif", "weighted"));
  $("#exportAsUnweightedGraphMl").click(performExport("export-to-graphml", "graphml", "unweighted"));
  $("#exportAsWeightedGraphMl").click(performExport("export-to-graphml", "graphml", "weighted"));
});
