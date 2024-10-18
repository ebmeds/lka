// * * * LÃ¤Ã¤kityksen kokonaisarvio Terveysporttiin * * *
// * * * Comprehensive Medication Guidelines to Terveysportti.fi -portal * * *

//setting all console logs off in production.
var DEBUG_MODE = false; // Set this value to false for production

if (typeof console === "undefined") {
  console = {};
}

if (!DEBUG_MODE || typeof console.log === "undefined") {
  console.log = console.time = console.timeEnd = function () { };
}
//cache is in use for medication searches.
function myCache() {
  return {
    data: {},
    remove: function (url) {
      delete localCache.data[url];
    },
    exist: function (url) {
      return (
        localCache.data.hasOwnProperty(url) && localCache.data[url] !== null
      );
    },
    get: function (url) {
      return localCache.data[url];
    },
    set: function (url, cachedData, callback) {
      localCache.remove(url);
      localCache.data[url] = cachedData;
      if ($.isFunction(callback)) callback(cachedData);
    }
  };
}
var localCache = myCache();
var infoCache = myCache();
var xhr;

//Cookie handling functions.
function createCookie(name, value, days) {
  var expires;
  if (days) {
    var date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = "; expires=" + date.toGMTString();
  } else {
    expires = "";
  }
  document.cookie =
    encodeURIComponent(name) +
    "=" +
    encodeURIComponent(value) +
    expires +
    "; path=/";
}
function readCookie(name) {
  var nameEQ = encodeURIComponent(name) + "=";
  var ca = document.cookie.split(";");
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0)
      return decodeURIComponent(c.substring(nameEQ.length, c.length));
  }
  return null;
}
function eraseCookie(name) {
  createCookie(name, "", -1);
}
function makeid() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  for (var i = 0; i < 5; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}
var uniqueid = new Date().getTime();
uniqueid += "_";
uniqueid += makeid();
createCookie("LKATPsessionID", uniqueid, 1);

var cookieContent = readCookie("LKATPsessionID");

//Fetches medication results.
function fetchResults(term) {
  console.log(
    "Function fetchResults starts - " +
    new Date().getHours() +
    ":" +
    new Date().getMinutes() +
    ":" +
    new Date().getSeconds() +
    "." +
    new Date().getMilliseconds()
  );
  var url = "/terveysportti/laake.lka.hakutulosLaake";
  $.ajax({
    url: url,
    data: {
      p_haku: term
    },
    cache: true,
    beforeSend: function () {
      if (localCache.exist(term)) {
        doSomething(localCache.get(term));
        return false;
      }
      $("#results").fadeTo("fast", 0.5);
      return true;
    },
    complete: function (jqXHR, textStatus) {
      console.log(
        "Ajax call to terveysportti successfull (drugs) - " +
        new Date().getHours() +
        ":" +
        new Date().getMinutes() +
        ":" +
        new Date().getSeconds() +
        "." +
        new Date().getMilliseconds()
      );
      localCache.set(term, jqXHR, doSomething);
    }
  });
}

//Fetches disgnosis results.
function fetchResultsDiag(term) {
  console.log(
    "Function fetchResultsDiag starts - " +
    new Date().getHours() +
    ":" +
    new Date().getMinutes() +
    ":" +
    new Date().getSeconds() +
    "." +
    new Date().getMilliseconds()
  );
  var url = "/terveysportti/laake.lka.hakutulosIcd";
  $.ajax({
    url: url,
    type: "GET",
    dataType: "json",
    contentType: "application/json",
    data: {
      p_haku: term
    },
    success: function (data) {
      console.log(
        "Ajax call to terveysportti successfull (diag) - " +
        new Date().getHours() +
        ":" +
        new Date().getMinutes() +
        ":" +
        new Date().getSeconds() +
        "." +
        new Date().getMilliseconds()
      );
      doSomethingDiagUusi(data);
    }
  });
}

//Generates list of medications
//that user can click to select to medication list.
function teeValmisteet(data, re) {
  console.log(
    "Function teeValmisteet starts - " +
    new Date().getHours() +
    ":" +
    new Date().getMinutes() +
    ":" +
    new Date().getSeconds() +
    "." +
    new Date().getMilliseconds()
  );
  re.push('<div class="row" id="drugSearchResults">');
  var unitFromDrugName = [];
  var unitFromDrugNameSplitted = [];
  var unitFromDrugNameUnits = [
    "cm",
    "g",
    "l",
    "IU",
    "KY",
    "MBq",
    "mg",
    "mikrog",
    "mikromol",
    "ml",
    "mmol",
    "mol",
    "ng",
    "U",
    "ug"
  ];
  for (var m = 0; m < data.length; m++) {
    //Parse unit from the drug name.
    unitFromDrugNameSplitted = data[m].title.replace("/", " |").split(" ");
    for (var y = 0; y < unitFromDrugNameSplitted.length; y++) {
      for (var x = 0; x < unitFromDrugNameUnits.length; x++) {
        if (
          unitFromDrugNameSplitted[y] == unitFromDrugNameUnits[x] &&
          unitFromDrugNameSplitted[y].charAt(0) != "|"
        ) {
          unitFromDrugName[m] = unitFromDrugNameUnits[x];
        }
      }
    }
    if (!unitFromDrugName[m]) {
      unitFromDrugName[m] = "";
      //Get data to unitfromdrugname -variable from json unit-field if the data is available.
      if (data[m].unit) {
        unitFromDrugName[m] = data[m].unit;
        console.log(
          'Drug unit data from "unit" -field in JSON - ' +
          new Date().getHours() +
          ":" +
          new Date().getMinutes() +
          ":" +
          new Date().getSeconds() +
          "." +
          new Date().getMilliseconds()
        );
      }
    } else {
      console.log(
        'Drug unit data from "title" -field in JSON  - ' +
        new Date().getHours() +
        ":" +
        new Date().getMinutes() +
        ":" +
        new Date().getSeconds() +
        "." +
        new Date().getMilliseconds()
      );
      if (!data[m].unit) {
        unitFromDrugName[m] = "";
      }
    }
    if (unitFromDrugName[m] == "mikrog") {
      unitFromDrugName[m] = "ug";
    }
    var vnrFirst = "";
    if (typeof data[m].vnr !== 'undefined') {
      vnrFirst = data[m].vnr[0];
    }
    //Push link to be displayed in area on right side of search field.
    re.push(
      '<div class="col-sm-11 everyOtherColor"><div class="col-sm-10 searchresult-text">' +
      '<a href="javascript:void(null);" title="ATC: ' +
      data[m].atc +
      ", VNR: " +
      vnrFirst +
      "\" onClick=\"addTextInputDrug('drugDiv','lÃ¤Ã¤kettÃ¤'," +
      "'lÃ¤Ã¤kkeen nimi','drugName','drugDiv2'," +
      "'lÃ¤Ã¤kkeen ATC-koodi','drugCode','drugDiv3'," +
      "'lÃ¤Ã¤kkeen vahvuus','drugStrength','drugDiv4'," +
      "'lÃ¤Ã¤kkeen yksikkÃ¶','drugUnit','drugDiv5','KokonaispÃ¤ivÃ¤annos'," +
      "'drugDailyDosage','drugDiv6','lÃ¤Ã¤kkeen antoreitti'," +
      "'drugRoute','drugCode2','" +
      data[m].title +
      "'," +
      "'" +
      data[m].atc +
      "','" +
      vnrFirst +
      "'," +
      "'" +
      unitFromDrugName[m] +
      "','" +
      data[m].product +
      "','" +
      data[m].strength +
      "')\">"
    );
    re.push(data[m].title);
    re.push(
      '</div><div class="col-sm-2">' +
      '<span class="glyphicon glyphicon-plus-sign"></span></div></a></div>'
    );
  }
  re.push("</div>");
}

//this function parses medication json and starts teeValmisteet function.
function doSomething(data) {
  console.log(
    "Function doSomething starts - " +
    new Date().getHours() +
    ":" +
    new Date().getMinutes() +
    ":" +
    new Date().getSeconds() +
    "." +
    new Date().getMilliseconds()
  );
  $("#results").fadeTo("fast", 1.0);
  var j = jQuery.parseJSON(data.responseText);
  var out;
  var reV = [];
  var reA = [];
  $("#hakuLuokitus").html("");
  if (j.result.length == 0 && j.suggestion) {
    console.log(
      "Found data to be suggested - " +
      new Date().getHours() +
      ":" +
      new Date().getMinutes() +
      ":" +
      new Date().getSeconds() +
      "." +
      new Date().getMilliseconds()
    );
  } else {
    for (var i = 0; i < j.result.length; i++) {
      if (j.result[i].data.length > 0) {
        console.log(
          "Found data to be displayed (drugs) - " +
          new Date().getHours() +
          ":" +
          new Date().getMinutes() +
          ":" +
          new Date().getSeconds() +
          "." +
          new Date().getMilliseconds()
        );
        if (j.result[i].title == "LÃ¤Ã¤keryhmÃ¤t") {
        } else {
          teeValmisteet(j.result[i].data, reV);
        }
      }
    }
  }
  $("#hakuValmisteet").html(reV.join(""));
  $("#hakuArtikkelit").html(reA.join(""));
  $('#myTab a[href="#hakutulos"]').tab("show");
}

//Function that generates diagnosis based on new Json interface.
function doSomethingDiagUusi(jsondata) {
  console.log(
    "Function doSomethingDiagUusi starts - " +
    new Date().getHours() +
    ":" +
    new Date().getMinutes() +
    ":" +
    new Date().getSeconds() +
    "." +
    new Date().getMilliseconds()
  );
  $("#results").fadeTo("fast", 1.0);
  var j = jsondata;
  var out;
  var reV = [];
  var reA = [];
  $("#hakuLuokitus").html("");
  if (j.result[0]) {
    if (j.result[0].data[0]) {
      reV.push('<div class="row" id="diagrow">');
      for (var i = 0; i < j.result[0].data.length; i++) {
        console.log(
          "Found data to be displayed (diagnosis) - " +
          new Date().getHours() +
          ":" +
          new Date().getMinutes() +
          ":" +
          new Date().getSeconds() +
          "." +
          new Date().getMilliseconds()
        );
        reV.push("<div class='col-sm-11 everyOtherColor'>");
        reV.push(
          '<div class="col-sm-10 searchresult-text">' +
          '<a title="ICD-10: ' +
          j.result[0].data[i].url +
          '" ' +
          'onClick=\'addTextInputIndication("indicationDiv",' +
          '"diagnoosia","diagnoosin nimi","indicationName",' +
          '"indicationDiv2","diagnoosin ICD10-koodi",' +
          '"indicationCode","' +
          j.result[0].data[i].url +
          '",' +
          '"' +
          j.result[0].data[i].title.replace("'", "`") +
          "\")'>"
        );
        if (j.result[0].data[i].score > 50) {
          reV.push("<b>");
        }
        reV.push(j.result[0].data[i].url + " - " + j.result[0].data[i].title);
        if (j.result[0].data[i].score > 50) {
          reV.push("</b>");
        }
        reV.push(
          '</div><div class="col-sm-2"><span class="glyphicon glyphicon-plus-sign"></span></div></a>'
        );
        reV.push("</div>");
      }
      reV.push("</div>");
    }
  }
  $("#hakuDiagnoosit").html(reV.join(""));
  $("#hakuArtikkelit").html(reA.join(""));
  $('#myTab a[href="#hakutulos"]').tab("show");
}

//Function to strip not allowed characters from webform values.
//Used in generateXMLmessage -function.
function xmlSafe(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

//Function to add new text inputs when user clicks the button to add
//new indications. Maximum of 99 indications.
var counter = 1;
var limit = 99;
function addTextInputIndication(
  divName,
  alertText,
  htmlText,
  variableName,
  divName2,
  htmlText2,
  variableName2,
  indIdTP,
  indNameTP
) {
  if (counter == limit + 1) {
    alert("Voit lisÃ¤tÃ¤ maksimissaan " + (counter - 1) + " " + alertText);
  } else {
    console.log(
      "Function addTextInputIndication starts - " +
      new Date().getHours() +
      ":" +
      new Date().getMinutes() +
      ":" +
      new Date().getSeconds() +
      "." +
      new Date().getMilliseconds()
    );
    var newdiv = document.createElement("div");
    newdiv.innerHTML =
      "<div id='indicationNameDiv_" +
      counter +
      "'>" +
      "<input type='hidden' name='" +
      variableName +
      "[]' class='" +
      variableName +
      "Field form-control' value='" +
      indNameTP +
      "'></div>";
    document.getElementById(divName).appendChild(newdiv);
    //$('#'+divName).prepend(newdiv);
    var newdiv2 = document.createElement("div");
    newdiv2.innerHTML =
      "<div class='col-sm-12' id='indicationCodeDiv_" +
      counter +
      "'>" +
      "<input type='hidden' name='" +
      variableName2 +
      "[]' " +
      "class='" +
      variableName2 +
      "Field form-control' value='" +
      indIdTP +
      "'>" +
      indIdTP +
      " - " +
      indNameTP +
      "<button data-toggle='tooltip' data-placement='top' title='Poista diagnoosi' type='button' class='close' " +
      "onclick='removeIndication(" +
      counter +
      ")'>" +
      "<span class='glyphicon glyphicon-trash'></span></button></div>";
    document.getElementById(divName2).appendChild(newdiv2);
    //clear query drugs form fields and results.
    $("#hakuDiagnoosit").hide();
    $("#hakuDiagnoositTitle").hide();
    $("#p_haku2").val("");
    $("#p_haku2").typeahead("val", "");
    document.getElementById("p_haku2").focus();
    $("body").tooltip({
      selector: "[data-toggle=tooltip]"
    });
    counter++;
  }
}

//Function to add new text inputs when user clicks the button to add new drugs.
//Maximum of 999 drugs.
var counter2 = 1;
var limit2 = 999;
function addTextInputDrug(
  divName,
  alertText,
  htmlText,
  variableName,
  divName2,
  htmlText2,
  variableName2,
  divName3,
  htmlText3,
  variableName3,
  divName4,
  htmlText4,
  variableName4,
  divName5,
  htmlText5,
  variableName5,
  divName6,
  htmlText6,
  variableName6,
  variableName7,
  drugNameTP,
  drugATCTP,
  drugVNRTP,
  drugUnitValue,
  shortname,
  drugStrength
) {
  if (counter2 == limit2 + 1) {
    alert("Voit lisÃ¤tÃ¤ maksimissaan " + (counter2 - 1) + " " + alertText);
  } else {
    console.log(
      "Function addTextInputDrug starts - " +
      new Date().getHours() +
      ":" +
      new Date().getMinutes() +
      ":" +
      new Date().getSeconds() +
      "." +
      new Date().getMilliseconds()
    );
    var newdiv = document.createElement("div");
    var hidedosage = "";
    if (drugUnitValue == "") {
      hidedosage = "hidedosage";
    }
    newdiv.innerHTML =
      "<div class='row col-xs-12' id='drugNameDiv_" +
      counter2 +
      "'>" +
      "<input type='hidden' name='" +
      variableName +
      "[]' class='" +
      variableName +
      "Field form-control' value='" +
      shortname +
      "'>" +
      "<div class='col-xs-4' id='drugDosageDiv_" +
      counter2 +
      "'>" +
      "<b>" +
      drugNameTP +
      "</b>" +
      "</div>" +
      "<div class='col-xs-3 " +
      hidedosage +
      "' id='drugUnitDiv_" +
      counter2 +
      "'>" +
      htmlText5 +
      " (" +
      drugUnitValue +
      "): <input type='text' id='" +
      variableName5 +
      "_" +
      counter2 +
      "' placeholder='syÃ¶tÃ¤ mÃ¤Ã¤rÃ¤' name='" +
      variableName5 +
      "[]' class='" +
      variableName5 +
      "Field form-control'>" +
      "<input type='hidden' name='" +
      variableName4 +
      "[]' class='" +
      variableName4 +
      "Field form-control' value='" +
      drugUnitValue +
      "'>" +
      "<input type='hidden' name='" +
      variableName3 +
      "[]' class='" +
      variableName3 +
      "Field form-control' value='" +
      drugStrength +
      "'>" +
      "</div>" +
      "<div class='col-xs-1 unitAfterInput' id='drugUnit2Div_" +
      counter2 +
      "'>" +
      drugUnitValue +
      "</div>" +
      "<div class='col-xs-4' id='drugDateDiv_" +
      counter2 +
      "'>" +
      "<div class='checkbox'><label><input type='checkbox' " +
      "name='drugDate[]' value='newDrug' class='drugDateField' id='drugDate_" +
      (counter2 - 1) +
      "'>uusi lÃ¤Ã¤ke potilaalle</label>" +
      "&nbsp;<a rel='tooltip' data-toggle='tooltip' data-placement='left' " +
      "title='Valitse, ellei lÃ¤Ã¤ke ole aikaisemmin ollut potilaalla kÃ¤ytÃ¶ssÃ¤. " +
      "Vaihtoehtoa voidaan myÃ¶s kÃ¤yttÃ¤Ã¤, jos halutaan testata miten lÃ¤Ã¤kkeen " +
      "lisÃ¤ys potilaan lÃ¤Ã¤kitykseen potentiaalisesti vaikuttaisi " +
      "lÃ¤Ã¤kityksen kokonaisarviointiin.'><span class='glyphicon glyphicon-info-sign'></span></a>" +
      "<button data-toggle='tooltip' data-placement='top' title='Poista lÃ¤Ã¤ke' type='button' " +
      "class='close' id='removeDrugButton_" +
      counter2 +
      "' onclick='removeDrug(" +
      counter2 +
      "," +
      limit2 +
      ")'><span class='glyphicon glyphicon-trash'></span></button></div>" +
      "</div>";
    document.getElementById(divName).appendChild(newdiv);
    var newdiv2 = document.createElement("div");
    newdiv2.innerHTML =
      "<div class='col-xs-12' id='drugCodeDiv_" +
      counter2 +
      "'><input type='hidden' name='" +
      variableName2 +
      "[]' class='" +
      variableName2 +
      "Field form-control' value='" +
      drugATCTP +
      "'><input " +
      "type='hidden' name='" +
      variableName7 +
      "[]' class='" +
      variableName7 +
      "Field form-control' value='" +
      drugVNRTP +
      "'></div></div>";
    document.getElementById(divName2).appendChild(newdiv2);
    //clear query drugs form fields and results.
    $("#hakuValmisteet").hide();
    $("#hakuValmisteetTitle").hide();
    $("#p_haku").val("");
    $("#p_haku").typeahead("val", "");
    document.getElementById("p_haku").focus();
    $("body").tooltip({
      selector: "[data-toggle=tooltip]"
    });
    validateForm("N");
    counter2++;
  }
}

//Code to Remove html element from webform.
//Used when user clicks "remove drug/indication"-functionality.
Element.prototype.remove = function () {
  this.parentElement.removeChild(this);
};
NodeList.prototype.remove = HTMLCollection.prototype.remove = function () {
  for (var i = this.length - 1; i >= 0; i--) {
    if (this[i] && this[i].parentElement) {
      this[i].parentElement.removeChild(this[i]);
    }
  }
};

//Function to remove indication. Called from button next to indication.
function removeIndication(removeId) {
  console.log(
    "Remove indication - " +
    new Date().getHours() +
    ":" +
    new Date().getMinutes() +
    ":" +
    new Date().getSeconds() +
    "." +
    new Date().getMilliseconds()
  );
  document.getElementById("indicationNameDiv_" + removeId).remove();
  document.getElementById("indicationCodeDiv_" + removeId).remove();
  counter = counter - 1;
}

//Function to remove drug. Called from button next to drug.
function removeDrug(removeId, limit2) {
  console.log(
    "Remove drug - " +
    new Date().getHours() +
    ":" +
    new Date().getMinutes() +
    ":" +
    new Date().getSeconds() +
    "." +
    new Date().getMilliseconds()
  );
  document.getElementById("drugCodeDiv_" + removeId).remove();
  document.getElementById("drugUnitDiv_" + removeId).remove();
  document.getElementById("drugUnit2Div_" + removeId).remove();
  document.getElementById("drugDosageDiv_" + removeId).remove();
  document.getElementById("drugDateDiv_" + removeId).remove();
  document.getElementById("drugNameDiv_" + removeId).remove();
  counter2 = counter2 - 1;
  for (var i = 1; i < limit2 + 1; i++) {
    if (
      $("#drugNameDiv_" + i).length == 0 &&
      $("#drugNameDiv_" + (i + 1)).length > 0
    ) {
      document.getElementById("drugNameDiv_" + (i + 1)).id = "drugNameDiv_" + i;
      document.getElementById("drugCodeDiv_" + (i + 1)).id = "drugCodeDiv_" + i;
      document.getElementById("drugUnitDiv_" + (i + 1)).id = "drugUnitDiv_" + i;
      document.getElementById("drugUnit2Div_" + (i + 1)).id =
        "drugUnit2Div_" + i;
      document.getElementById("drugDosageDiv_" + (i + 1)).id =
        "drugDosageDiv_" + i;
      document.getElementById("drugDateDiv_" + (i + 1)).id = "drugDateDiv_" + i;
      document.getElementById("drugDate_" + i).id = "drugDate_" + (i - 1);
      $("#removeDrugButton_" + (i + 1)).attr(
        "onclick",
        "removeDrug('" + i + "','" + limit2 + "')"
      );
      document.getElementById("removeDrugButton_" + (i + 1)).id =
        "removeDrugButton_" + i;
    }
  }
}

//Add values to XML based on filled form.
//This function is executed when user clicks submit button (or closes modal window).
function generateXMLmessage() {
  console.log(
    "XML generation: Validation - " +
    new Date().getHours() +
    ":" +
    new Date().getMinutes() +
    ":" +
    new Date().getSeconds() +
    "." +
    new Date().getMilliseconds()
  );
  //Webform validation before XML is generated and sent.
  var alertMessage = "Tietojen lÃ¤hettÃ¤misessÃ¤ tapahtui virhe:\n";
  if (document.LKAform.dateOfBirth.value == "") {
    alertMessage += "SyntymÃ¤vuosi puuttuu\n";
  } else {
    if (
      isNaN(document.LKAform.dateOfBirth.value) &&
      document.LKAform.dateOfBirth.value.length > 0
    ) {
      alertMessage += "SyntymÃ¤vuosi oltava numeerinen\n";
    } else {
      //Oldest person in the world lived to be 122 years old.
      //Let's give a change to all people
      //who are going to be 123 years old.
      if (
        document.LKAform.dateOfBirth.value < new Date().getFullYear() - 123 ||
        document.LKAform.dateOfBirth.value > new Date().getFullYear()
      ) {
        alertMessage += "Anna oikea syntymÃ¤vuosi\n";
      }
    }
  }
  if (
    document.getElementById("gender1").checked == false &&
    document.getElementById("gender2").checked == false
  ) {
    alertMessage += "Sukupuoli puuttuu\n";
  }
  function checkNumericPositive(checkValue, checkTitle, checkDiv) {
    checkValue = checkValue.replace(",", ".");
    if (isNaN(checkValue) && checkValue.length > 0) {
      alertMessage += checkTitle + " oltava numeerinen\n";
    } else if (checkValue < 0) {
      alertMessage += checkTitle + " oltava positiivinen luku\n";
    }
  }
  checkNumericPositive(
    xmlSafe(document.LKAform.skrea.value),
    "S-Krea",
    "skrea"
  );
  checkNumericPositive(
    xmlSafe(document.LKAform.pituus.value),
    "Pituus",
    "pituus"
  );
  checkNumericPositive(xmlSafe(document.LKAform.paino.value), "Paino", "paino");
  checkNumericPositive(
    xmlSafe(document.LKAform.verenpaineSystolinen.value),
    "Verenpaine: Systolinen",
    "verenpaineSystolinen"
  );
  checkNumericPositive(
    xmlSafe(document.LKAform.verenpaineDiastolinen.value),
    "Verenpaine: Diastolinen",
    "verenpaineDiastolinen"
  );
  checkNumericPositive(
    xmlSafe(document.LKAform.kolesteroli.value),
    "Kokonaiskolesteroli",
    "kolesteroli"
  );
  checkNumericPositive(
    xmlSafe(document.LKAform.HDLkolesteroli.value),
    "HDL-kolesteroli",
    "HDLkolesteroli"
  );
  checkNumericPositive(
    xmlSafe(document.LKAform.triglyseridit.value),
    "Triglyseridit",
    "triglyseridit"
  );
  checkNumericPositive(
    xmlSafe(document.LKAform.LDLkolesteroli.value),
    "LDL-kolesteroli",
    "LDLkolesteroli"
  );
  checkNumericPositive(
    xmlSafe(document.LKAform.paastoverensokeri.value),
    "Paastoverensokeri",
    "paastoverensokeri"
  );
  checkNumericPositive(xmlSafe(document.LKAform.hba1c.value), "HbA1c", "hba1c");
  checkNumericPositive(
    xmlSafe(document.LKAform.hba1c2.value),
    "HbA1c",
    "hba1c"
  );
  checkNumericPositive(xmlSafe(document.LKAform.inr.value), "INR", "inr");
  checkNumericPositive(
    xmlSafe(document.LKAform.hemoglobiini.value),
    "Hemoglobiini",
    "hemoglobiini"
  );
  checkNumericPositive(
    xmlSafe(document.LKAform.valkosolut.value),
    "Valkosolut",
    "valkosolut"
  );
  checkNumericPositive(
    xmlSafe(document.LKAform.verihiutaleet.value),
    "Verihiutaleet",
    "verihiutaleet"
  );
  checkNumericPositive(xmlSafe(document.LKAform.alat.value), "ALAT", "alat");
  checkNumericPositive(
    xmlSafe(document.LKAform.kalium.value),
    "Kalium",
    "kalium"
  );
  checkNumericPositive(
    xmlSafe(document.LKAform.natrium.value),
    "Natrium",
    "natrium"
  );
  checkNumericPositive(xmlSafe(document.LKAform.tsh.value), "TSH", "tsh");
  checkNumericPositive(
    xmlSafe(document.LKAform.cualb.value),
    "cU-Alb tai nU-Alb",
    "cualb"
  );
  checkNumericPositive(
    xmlSafe(document.LKAform.dualb.value),
    "dU-Alb",
    "dualb"
  );
  checkNumericPositive(
    xmlSafe(document.LKAform.ualbkre.value),
    "U-AlbKre",
    "ualbkre"
  );
  for (var i = 1; i <= limit2; i++) {
    if (document.getElementById("drugDailyDosage_" + i)) {
      checkNumericPositive(
        xmlSafe(document.getElementById("drugDailyDosage_" + i).value),
        "KokonaispÃ¤ivÃ¤annos",
        "KokonaispÃ¤ivÃ¤annos"
      );
    }
  }
  if (
    typeof document.getElementById("drugCodeDiv_1") == "undefined" ||
    document.getElementById("drugCodeDiv_1") == null
  ) {
    alertMessage += "LisÃ¤Ã¤ ainakin yksi lÃ¤Ã¤ke\n";
  }
  //Return error message and do not send webform if there is any other text
  //added to alertMessage than "Tietojen lÃ¤hettÃ¤misessÃ¤..."
  if (alertMessage.length > 40) {
    console.timeEnd("Validating form and generating xml took time");
    //reopen the webform modal window.
    var allEmpty = false;
    $(":input:text").each(function (index, element) {
      if (element.value !== "") {
        allEmpty = false;
      }
    });
    if ($("input:radio[name='gender']").is(":checked") == true) {
      allEmpty = false;
    }
    if ($("input:checkbox[name='procedure']").is(":checked") == true) {
      allEmpty = false;
    }
    if (
      typeof document.getElementById("drugCodeDiv_1") == "undefined" ||
      document.getElementById("drugCodeDiv_1") == null
    ) {
    } else {
      allEmpty = false;
    }
    if (
      typeof document.getElementById("indicationCodeDiv_1") == "undefined" ||
      document.getElementById("indicationCodeDiv_1") == null
    ) {
    } else {
      allEmpty = false;
    }
    if (allEmpty == false) {
      alert(alertMessage);
      //setTimeout(function(){$('#LKAmodal').modal({show:'true'})},400);
    }
    return false;
  }
  console.log(
    "XML generation: Header - " +
    new Date().getHours() +
    ":" +
    new Date().getMinutes() +
    ":" +
    new Date().getSeconds() +
    "." +
    new Date().getMilliseconds()
  );
  document.LKAform.dssData.value =
    '<?xml version="1.0" encoding="utf-8"?>' +
    '<DSSRequest xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
    "xsi:noNamespaceSchemaLocation=" +
    '"http://www.ebmeds.org/xsd/EBMeDSBasicInterface_v1.21.xsd"><Patient>' +
    "<Properties><BirthTimeStamp><Year>";
  console.log(
    "XML generation: Birthyear - " +
    new Date().getHours() +
    ":" +
    new Date().getMinutes() +
    ":" +
    new Date().getSeconds() +
    "." +
    new Date().getMilliseconds()
  );
  document.LKAform.dssData.value += xmlSafe(document.LKAform.dateOfBirth.value);
  document.LKAform.dssData.value +=
    "</Year><Month>1</Month><Day>1</Day>" +
    "<Hour>0</Hour><Minute>0</Minute></BirthTimeStamp><Gender>";
  //Selected gender copied to a variable that will be added to XML.
  //This ".checked" is required by some browsers (safari).
  //With some browsers you could directly use ".value" (chrome).
  console.log(
    "XML generation: Gender - " +
    new Date().getHours() +
    ":" +
    new Date().getMinutes() +
    ":" +
    new Date().getSeconds() +
    "." +
    new Date().getMilliseconds()
  );
  var selectedGender = "";
  if (document.getElementById("gender1").checked) {
    selectedGender = document.getElementById("gender1").value;
  }
  if (document.getElementById("gender2").checked) {
    selectedGender = document.getElementById("gender2").value;
  }
  document.LKAform.dssData.value += xmlSafe(selectedGender);
  document.LKAform.dssData.value +=
    "</Gender></Properties><Risks>" +
    "<DrugsToAvoid></DrugsToAvoid><Smoking><SmokingStatus>";
  //Selected smoking status copied to a variable that will be added to XML.
  console.log(
    "XML generation: Smoking - " +
    new Date().getHours() +
    ":" +
    new Date().getMinutes() +
    ":" +
    new Date().getSeconds() +
    "." +
    new Date().getMilliseconds()
  );
  var selectedSmoking = "";
  if (document.getElementById("smoking-1").checked) {
    selectedSmoking = document.getElementById("smoking-1").value;
  }
  if (document.getElementById("smoking0").checked) {
    selectedSmoking = document.getElementById("smoking0").value;
  }
  if (document.getElementById("smoking1").checked) {
    selectedSmoking = document.getElementById("smoking1").value;
  }
  if (document.getElementById("smoking2").checked) {
    selectedSmoking = document.getElementById("smoking2").value;
  }
  document.LKAform.dssData.value += xmlSafe(selectedSmoking);
  document.LKAform.dssData.value +=
    "</SmokingStatus></Smoking><Pregnancy>" + "<Pregnant>";
  //Pregnancy checkbox value to be stored to XML.
  console.log(
    "XML generation: Pregnancy - " +
    new Date().getHours() +
    ":" +
    new Date().getMinutes() +
    ":" +
    new Date().getSeconds() +
    "." +
    new Date().getMilliseconds()
  );
  var pregnancy = "";
  if (document.getElementById("pregnancy").checked) {
    pregnancy = "1";
  } else {
    pregnancy = "0";
  }
  document.LKAform.dssData.value += xmlSafe(pregnancy);
  document.LKAform.dssData.value +=
    "</Pregnant></Pregnancy><Lactation>" + "<Lactating>";
  var lactating = "";
  //Lactation checkbox value to be stored to XML.
  console.log(
    "XML generation: Lactation - " +
    new Date().getHours() +
    ":" +
    new Date().getMinutes() +
    ":" +
    new Date().getSeconds() +
    "." +
    new Date().getMilliseconds()
  );
  if (document.getElementById("lactating").checked) {
    lactating = "1";
  } else {
    lactating = "0";
  }
  document.LKAform.dssData.value += xmlSafe(lactating);
  document.LKAform.dssData.value +=
    "</Lactating></Lactation></Risks>" + "<Problems><Diagnoses>";
  //getting dates for further usage in xml generation.
  var currentDate = new Date();
  var previousDate = new Date(new Date().setDate(new Date().getDate() - 1));
  var previousMonth = new Date(new Date().setDate(new Date().getDate() - 31));
  var previousYear = new Date(new Date().setDate(new Date().getDate() - 366));
  //Looping through Indication data from webform.
  console.log(
    "XML generation: Diagnosis - " +
    new Date().getHours() +
    ":" +
    new Date().getMinutes() +
    ":" +
    new Date().getSeconds() +
    "." +
    new Date().getMilliseconds()
  );
  var indicationValues = document.getElementsByTagName("input");
  var indCodes = [];
  var indNames = [];
  for (var i = 0; i < indicationValues.length; ++i) {
    if (typeof indicationValues[i].attributes.class !== "undefined") {
      if (
        indicationValues[i].attributes.class.value ===
        "indicationCodeField form-control"
      ) {
        indCodes.push(indicationValues[i].value);
      }
      if (
        indicationValues[i].attributes.class.value ===
        "indicationNameField form-control"
      ) {
        indNames.push(indicationValues[i].value);
      }
    }
  }
  //Inserting Indication data to XML.
  for (var i = 0; i < indCodes.length; i++) {
    document.LKAform.dssData.value += "<Diagnosis><CodeValue>";
    document.LKAform.dssData.value += xmlSafe(indCodes[i]);
    document.LKAform.dssData.value +=
      "</CodeValue><CodeSystem>" +
      "1.2.246.537.6.1</CodeSystem><CodeSystemVersion>" +
      "</CodeSystemVersion><StartStamp><StartDate>";
    document.LKAform.dssData.value +=
      previousMonth.getFullYear() +
      "-" +
      ("0" + (previousMonth.getMonth() + 1)).slice(-2) +
      "-" +
      ("0" + previousMonth.getDate()).slice(-2);
    document.LKAform.dssData.value +=
      "</StartDate></StartStamp>" + "<DiagnosisName>";
    document.LKAform.dssData.value += xmlSafe(indNames[i]);
    document.LKAform.dssData.value += "</DiagnosisName></Diagnosis>";
  }
  //Inserting S-Krea date and value to XML.
  //Inserting also all the other lab results.
  console.log(
    "XML generation: Labs - " +
    new Date().getHours() +
    ":" +
    new Date().getMinutes() +
    ":" +
    new Date().getSeconds() +
    "." +
    new Date().getMilliseconds()
  );
  document.LKAform.dssData.value +=
    "</Diagnoses></Problems><Investigations>" + "<Measurements>";
  function createLabResults(
    codeValue,
    codeSystem,
    formValue,
    unit,
    measurementName
  ) {
    if (formValue.length > 0) {
      document.LKAform.dssData.value +=
        "<Measurement><CodeValue>" +
        codeValue +
        "</CodeValue><CodeSystem>" +
        codeSystem +
        "</CodeSystem>" +
        "<CodeSystemVersion></CodeSystemVersion><PointStamp><PointDate>";
      document.LKAform.dssData.value +=
        previousDate.getFullYear() +
        "-" +
        ("0" + (previousDate.getMonth() + 1)).slice(-2) +
        "-" +
        ("0" + previousDate.getDate()).slice(-2);
      document.LKAform.dssData.value +=
        "</PointDate></PointStamp><Ordered>0" + "</Ordered><Result><Value>";
      document.LKAform.dssData.value += xmlSafe(formValue);
      document.LKAform.dssData.value +=
        "</Value><Unit>" +
        unit +
        "</Unit>" +
        "</Result><MeasurementName>" +
        measurementName +
        "</MeasurementName>" +
        "</Measurement>";
    }
  }
  createLabResults(
    "2143",
    "1.2.246.537.6.3",
    xmlSafe(document.LKAform.skrea.value),
    "umol/l",
    "S-Krea"
  );
  createLabResults(
    "8302-2",
    "1.2.246.537.6.96",
    xmlSafe(document.LKAform.pituus.value),
    "cm",
    "Pituus"
  );
  createLabResults(
    "29463-7",
    "1.2.246.537.6.96",
    xmlSafe(document.LKAform.paino.value),
    "kg",
    "Paino"
  );
  createLabResults(
    "8460-6",
    "1.2.246.537.6.96",
    xmlSafe(document.LKAform.verenpaineSystolinen.value),
    "mmHg",
    "Verenpaine: Systolinen"
  );
  createLabResults(
    "8453-3",
    "1.2.246.537.6.96",
    xmlSafe(document.LKAform.verenpaineDiastolinen.value),
    "mmHg",
    "Verenpaine: Diastolinen"
  );
  createLabResults(
    "4515",
    "1.2.246.537.6.3",
    xmlSafe(document.LKAform.kolesteroli.value),
    "mmol/l",
    "Kokonaiskolesteroli"
  );
  createLabResults(
    "4516",
    "1.2.246.537.6.3",
    xmlSafe(document.LKAform.HDLkolesteroli.value),
    "mmol/l",
    "HDL-kolesteroli"
  );
  createLabResults(
    "4568",
    "1.2.246.537.6.3",
    xmlSafe(document.LKAform.triglyseridit.value),
    "mmol/l",
    "Triglyseridit"
  );
  createLabResults(
    "4599",
    "1.2.246.537.6.3",
    xmlSafe(document.LKAform.LDLkolesteroli.value),
    "mmol/l",
    "LDL-kolesteroli"
  );
  createLabResults(
    "1468",
    "1.2.246.537.6.3",
    xmlSafe(document.LKAform.paastoverensokeri.value),
    "mmol/l",
    "Paastoverensokeri"
  );
  createLabResults(
    "6128",
    "1.2.246.537.6.3",
    xmlSafe(document.LKAform.hba1c.value),
    "mmol/mol",
    "HbA1c"
  );
  createLabResults(
    "6128",
    "1.2.246.537.6.3",
    xmlSafe(document.LKAform.hba1c2.value),
    "%",
    "HbA1c"
  );
  createLabResults(
    "4520",
    "1.2.246.537.6.3",
    xmlSafe(document.LKAform.inr.value),
    " ",
    "INR"
  );
  createLabResults(
    "1552",
    "1.2.246.537.6.3",
    xmlSafe(document.LKAform.hemoglobiini.value),
    "g/l",
    "Hemoglobiini"
  );
  createLabResults(
    "2218",
    "1.2.246.537.6.3",
    xmlSafe(document.LKAform.valkosolut.value),
    "E6/ml",
    "Valkosolut"
  );
  createLabResults(
    "2791",
    "1.2.246.537.6.3",
    xmlSafe(document.LKAform.verihiutaleet.value),
    "E9/l",
    "Verihiutaleet"
  );
  createLabResults(
    "1024",
    "1.2.246.537.6.3",
    xmlSafe(document.LKAform.alat.value),
    "U/I",
    "ALAT"
  );
  createLabResults(
    "1999",
    "1.2.246.537.6.3",
    xmlSafe(document.LKAform.kalium.value),
    "mmol/l",
    "Kalium"
  );
  createLabResults(
    "2382",
    "1.2.246.537.6.3",
    xmlSafe(document.LKAform.natrium.value),
    "mmol/l",
    "Natrium"
  );
  createLabResults(
    "4831",
    "1.2.246.537.6.3",
    xmlSafe(document.LKAform.tsh.value),
    "mU/l",
    "TSH"
  );
  createLabResults(
    "3557",
    "1.2.246.537.6.3",
    xmlSafe(document.LKAform.cualb.value),
    "ug/min",
    "cU-Alb tai nU-Alb"
  );
  createLabResults(
    "3134",
    "1.2.246.537.6.3",
    xmlSafe(document.LKAform.dualb.value),
    "mg",
    "dU-Alb"
  );
  createLabResults(
    "4511",
    "1.2.246.537.6.3",
    xmlSafe(document.LKAform.ualbkre.value),
    "mg/mmol",
    "U-AlbKre"
  );
  document.LKAform.dssData.value +=
    "</Measurements></Investigations>" + "<Interventions><Medication>";
  //Looping through Drug data from webform.
  console.log(
    "XML generation: Drugs- " +
    new Date().getHours() +
    ":" +
    new Date().getMinutes() +
    ":" +
    new Date().getSeconds() +
    "." +
    new Date().getMilliseconds()
  );
  var drugValues = document.getElementsByTagName("input");
  var drugValues2 = document.getElementsByTagName("select");
  var druCodes = [];
  var druCodesVNR = [];
  var druNames = [];
  var druStrength = [];
  var druUnit = [];
  var druDosage = [];
  var druRoute = [];
  //Looping input type=text or type=hidden fields.
  for (var i = 0; i < drugValues.length; ++i) {
    if (typeof drugValues[i].attributes.class !== "undefined") {
      if (
        drugValues[i].attributes.class.value === "drugCodeField form-control"
      ) {
        druCodes.push(drugValues[i].value);
      }
      if (
        drugValues[i].attributes.class.value === "drugCode2Field form-control"
      ) {
        druCodesVNR.push(drugValues[i].value);
      }
      if (
        drugValues[i].attributes.class.value === "drugNameField form-control"
      ) {
        druNames.push(drugValues[i].value);
      }
      if (
        drugValues[i].attributes.class.value ===
        "drugStrengthField form-control"
      ) {
        druStrength.push(drugValues[i].value);
      }
      if (
        drugValues[i].attributes.class.value === "drugUnitField form-control"
      ) {
        druUnit.push(drugValues[i].value);
      }
      if (
        drugValues[i].attributes.class.value ===
        "drugDailyDosageField form-control"
      ) {
        druDosage.push(drugValues[i].value);
      }
    }
  }
  //Looping select fields.
  for (var i = 0; i < drugValues2.length; ++i) {
    if (typeof drugValues2[i].attributes.class !== "undefined") {
      if (
        drugValues2[i].attributes.class.value === "drugRouteField form-control"
      ) {
        druRoute.push(drugValues2[i].value);
      }
    }
  }
  //Inserting Drug data to XML.
  for (var i = 0; i < druCodes.length; i++) {
    //Adding ATC and VNR codes.
    document.LKAform.dssData.value += "<Drug><CodeValue>";
    document.LKAform.dssData.value += xmlSafe(druCodes[i]);
    document.LKAform.dssData.value +=
      "</CodeValue><CodeSystem>" +
      "1.2.246.537.6.32.2007</CodeSystem><CodeSystemVersion>" +
      "</CodeSystemVersion>";
    document.LKAform.dssData.value += "<CodeValue>";
    document.LKAform.dssData.value += xmlSafe(druCodesVNR[i]);
    document.LKAform.dssData.value +=
      "</CodeValue><CodeSystem>VNR" +
      "</CodeSystem><CodeSystemVersion></CodeSystemVersion>";
    document.LKAform.dssData.value += "<Strength>";
    if (xmlSafe(druStrength[i]) !== "undefined") {
      if (xmlSafe(druStrength[i]).substring(0, 1) === '.') {
        document.LKAform.dssData.value += "0" + xmlSafe(druStrength[i]);
      }
      else {
        document.LKAform.dssData.value += xmlSafe(druStrength[i]);
      }
    }
    document.LKAform.dssData.value += "</Strength>";
    document.LKAform.dssData.value += "<StrengthUnit>";
    document.LKAform.dssData.value += xmlSafe(druUnit[i]);
    document.LKAform.dssData.value += "</StrengthUnit>";
    document.LKAform.dssData.value += "<DailyDose>";
    document.LKAform.dssData.value += xmlSafe(druDosage[i]);
    document.LKAform.dssData.value += "</DailyDose>";
    document.LKAform.dssData.value += "<StartStamp><StartDate>";
    if (document.getElementById("drugDate_" + i).checked == true) {
      document.LKAform.dssData.value +=
        currentDate.getFullYear() +
        "-" +
        ("0" + (currentDate.getMonth() + 1)).slice(-2) +
        "-" +
        ("0" + currentDate.getDate()).slice(-2);
    } else {
      document.LKAform.dssData.value +=
        previousYear.getFullYear() +
        "-" +
        ("0" + (previousYear.getMonth() + 1)).slice(-2) +
        "-" +
        ("0" + previousYear.getDate()).slice(-2);
    }
    document.LKAform.dssData.value += "</StartDate></StartStamp><DrugName>";
    document.LKAform.dssData.value += xmlSafe(druNames[i]);
    document.LKAform.dssData.value += "</DrugName></Drug>";
  }
  document.LKAform.dssData.value +=
    "</Medication><Vaccinations>" + "</Vaccinations><Procedures>";
  //Procedure checkbox value to be stored to XML.
  console.log(
    "XML generation: Procedures- " +
    new Date().getHours() +
    ":" +
    new Date().getMinutes() +
    ":" +
    new Date().getSeconds() +
    "." +
    new Date().getMilliseconds()
  );
  var procedureValue = [];
  var procedureName = [];
  if (document.getElementById("procedure1").checked) {
    procedureValue[0] = xmlSafe(
      document.LKAform.procedure[0].value.split(",")[0]
    );
    procedureName[0] = xmlSafe(
      document.LKAform.procedure[0].value.split(",")[1]
    );
  } else {
    procedureValue[0] = "";
    procedureName[0] = "";
  }
  if (document.getElementById("procedure2").checked) {
    procedureValue[1] = xmlSafe(
      document.LKAform.procedure[1].value.split(",")[0]
    );
    procedureName[1] = xmlSafe(
      document.LKAform.procedure[1].value.split(",")[1]
    );
  } else {
    procedureValue[1] = "";
    procedureName[1] = "";
  }
  if (document.getElementById("procedure3").checked) {
    procedureValue[2] = xmlSafe(
      document.LKAform.procedure[2].value.split(",")[0]
    );
    procedureName[2] = xmlSafe(
      document.LKAform.procedure[2].value.split(",")[1]
    );
  } else {
    procedureValue[2] = "";
    procedureName[2] = "";
  }
  //Inserting Procedures data to XML.
  for (var i = 0; i < document.LKAform.procedure.length; i++) {
    if (procedureValue[i]) {
      if (procedureValue[i].length > 0) {
        document.LKAform.dssData.value += "<Procedure><CodeValue>";
        document.LKAform.dssData.value += xmlSafe(procedureValue[i]);
        document.LKAform.dssData.value +=
          "</CodeValue><CodeSystem>" +
          "2.16.840.1.113883.6.104</CodeSystem><CodeSystemVersion>" +
          "</CodeSystemVersion><PointStamp><PointDate>";
        document.LKAform.dssData.value +=
          previousYear.getFullYear() +
          "-" +
          ("0" + (previousYear.getMonth() + 1)).slice(-2) +
          "-" +
          ("0" + previousYear.getDate()).slice(-2);
        document.LKAform.dssData.value +=
          "</PointDate></PointStamp><Ordered>0" + "</Ordered><ProcedureName>";
        document.LKAform.dssData.value += xmlSafe(procedureName[i]);
        document.LKAform.dssData.value += "</ProcedureName></Procedure>";
      }
    }
  }
  //Rest of the XML is hardcoded.
  console.log(
    "XML generation: Footer - " +
    new Date().getHours() +
    ":" +
    new Date().getMinutes() +
    ":" +
    new Date().getSeconds() +
    "." +
    new Date().getMilliseconds()
  );
  document.LKAform.dssData.value +=
    "</Procedures></Interventions></Patient>" +
    "<System><User><HealthCareRole>Physician</HealthCareRole>" +
    "<HealthCareOrganization><CodeValue>" + document.LKAform.organization.value + "</CodeValue><CodeSystem>" +
    "</CodeSystem><CodeSystemVersion></CodeSystemVersion>" +
    "</HealthCareOrganization><HealthCareSpecialty><CodeValue></CodeValue>" +
    "<CodeSystem></CodeSystem><CodeSystemVersion></CodeSystemVersion>" +
    "</HealthCareSpecialty><Language><CodeValue>fi</CodeValue><CodeSystem>" +
    "2.16.840.1.113883.6.99</CodeSystem><CodeSystemVersion>" +
    "</CodeSystemVersion></Language><Nation><CodeValue>fi</CodeValue>" +
    "<CodeSystem>ISO 3166-1</CodeSystem><CodeSystemVersion>" +
    "</CodeSystemVersion></Nation></User><Application><ApplicationName>cmrurl" +
    "</ApplicationName><QueryID>";
  var uniqueid2 = new Date().getTime();
  uniqueid2 += "_";
  uniqueid2 += makeid();
  document.LKAform.dssData.value += cookieContent + "_" + uniqueid2;
  document.LKAform.dssData.value +=
    "</QueryID><DSSVersion>" +
    "EBMeDS Basic Interface v1.21</DSSVersion><ScriptSelection>" +
    "<ScriptsToRun></ScriptsToRun></ScriptSelection><FeedbackType>0" +
    "</FeedbackType><CheckMoment><CheckDate>";
  document.LKAform.dssData.value +=
    currentDate.getFullYear() +
    "-" +
    ("0" + (currentDate.getMonth() + 1)).slice(-2) +
    "-" +
    ("0" + currentDate.getDate()).slice(-2);
  document.LKAform.dssData.value +=
    "</CheckDate>" +
    "<CheckTime>12:00:00</CheckTime></CheckMoment><EventTypes><EventType>" +
    "onNewDiagnosis</EventType></EventTypes></Application></System>" +
    "<ExperimentalDataSets><ExperimentalDataSet><DataSetName>SkinFileName" +
    "</DataSetName><DataSetText>ebmeds_default.css</DataSetText>" +
    "</ExperimentalDataSet><ExperimentalDataSet><DataSetName>ServerCache" +
    "</DataSetName><DataSetText>yes</DataSetText></ExperimentalDataSet>" +
    "</ExperimentalDataSets></DSSRequest>";
  //Everything is ok. OnSubmit operation in <FORM>-tag is approved.
  //XML is sent to EBMeDS-engine.

  // Send to test environment if YA
  //if (window.location.hash === '#ya') {
    document.LKAform.action = 'https://proxy-fikd7nv7fa-lz.a.run.app/lkatp/dssscripts/dss.asp'
    document.LKAform.data.value = document.LKAform.dssData.value
  //}
  
  console.log(
    "Sending this xml to ebmeds engine:\n\n" +
    document.LKAform.dssData.value +
    "\n\n- " +
    new Date().getHours() +
    ":" +
    new Date().getMinutes() +
    ":" +
    new Date().getSeconds() +
    "." +
    new Date().getMilliseconds()
  );
  console.timeEnd("Validating form and generating xml took time");
  return true;
}

//handling of gender specific fields.
function toggleGenderFields() {
  console.log(
    "Handling of gender specific fields - " +
    new Date().getHours() +
    ":" +
    new Date().getMinutes() +
    ":" +
    new Date().getSeconds() +
    "." +
    new Date().getMilliseconds()
  );
  document.LKAform.dssData.value;
  if (document.getElementById("gender2").checked == true) {
    if (document.LKAform.dateOfBirth.value == "") {
      $("#PregnantLactating").hide();
    } else {
      if (
        isNaN(document.LKAform.dateOfBirth.value) &&
        document.LKAform.dateOfBirth.value.length > 0
      ) {
        $("#PregnantLactating").hide();
      } else {
        //15-55 years old is the limit to be pregnant (in this code).
        if (
          document.LKAform.dateOfBirth.value < new Date().getFullYear() - 55 ||
          (document.LKAform.dateOfBirth.value > new Date().getFullYear() - 15 ||
            document.LKAform.dateOfBirth.value > new Date().getFullYear())
        ) {
          $("#PregnantLactating").hide();
        } else {
          $("#PregnantLactating").show();
        }
      }
    }
  } else {
    $("#PregnantLactating").hide();
  }
  //fixes chrome bug that it does not expand modal window grey background.
  //setTimeout(function(){$('#LKAmodal').data('bs.modal').handleUpdate();},80);
}

//handling of advanced view / basic view.
function toggleAdvancedFields() {
  console.log(
    "Handling of basic/advanced fields - " +
    new Date().getHours() +
    ":" +
    new Date().getMinutes() +
    ":" +
    new Date().getSeconds() +
    "." +
    new Date().getMilliseconds()
  );
  if (document.getElementById("toggleAdvanced").checked == true)
    $("#AdvancedView").show();
  else
    //$("#AdvancedView").hide(); - commented because we want to always show.
    //Decision in meeting 21.10.2015.
    $("#AdvancedView").show();
  //fixes chrome bug that it does not expand modal window grey background.
  //setTimeout(function(){$('#LKAmodal').data('bs.modal').handleUpdate();},80);
}

//This function is run every time user modifies the webform.
function validateForm(formSent) {
  if (formSent == "Y") {
    $("#BirthSpan").remove();
    if (document.LKAform.dateOfBirth.value == "") {
      $("#BirthDiv").attr("class", "form-group has-error has-feedback");
      $("#BirthDiv2").append(
        '<span id="BirthSpan" class="glyphicon ' +
        'glyphicon-warning-sign form-control-feedback"></span>'
      );
    } else {
      $("#BirthDiv").attr("class", "form-group");
      $("#BirthSpan").remove();
      if (
        isNaN(document.LKAform.dateOfBirth.value) &&
        document.LKAform.dateOfBirth.value.length > 0
      ) {
        $("#BirthDiv").attr("class", "form-group has-error has-feedback");
        $("#BirthDiv2").append(
          '<span id="BirthSpan" class="glyphicon ' +
          'glyphicon-warning-sign form-control-feedback"></span>'
        );
      } else {
        $("#BirthDiv").attr("class", "form-group");
        $("#BirthSpan").remove();
        //Oldest person in the world lived to be 122 years old.
        //Let's give a change to all people
        //who are going to be 123 years old.
        if (
          document.LKAform.dateOfBirth.value < new Date().getFullYear() - 123 ||
          document.LKAform.dateOfBirth.value > new Date().getFullYear()
        ) {
          $("#BirthDiv").attr(
            "class",
            "form-group has-error " + "has-feedback"
          );
          $("#BirthDiv2").append(
            '<span id="BirthSpan"class="glyphicon ' +
            'glyphicon-warning-sign form-control-feedback"></span>'
          );
        } else {
          $("#BirthDiv").attr("class", "form-group");
          $("#BirthSpan").remove();
        }
      }
    }
    if (
      document.getElementById("gender1").checked == false &&
      document.getElementById("gender2").checked == false
    ) {
      $("#GenderDiv").attr("class", "form-group has-error has-feedback");
    } else {
      $("#GenderDiv").attr("class", "form-group");
    }
    var hba1cerror = 0;
    function checkNumericPositive(
      checkValue,
      checkTitle,
      checkDiv,
      Drug,
      hba1cerror
    ) {
      $("#" + checkDiv + "Span").remove();
      checkValue = checkValue.replace(",", ".");
      if (isNaN(checkValue) && checkValue.length > 0) {
        if (Drug == 0) {
          if ($("#" + checkDiv + "Div").hasClass("hidethis") == false) {
            $("#" + checkDiv + "Div").attr(
              "class",
              "form-group has-error " + "has-feedback"
            );
          }
          $("#" + checkDiv + "Div2").append(
            '<span id="' +
            checkDiv +
            'Span" ' +
            'class="glyphicon glyphicon-warning-sign ' +
            'form-control-feedback"></span>'
          );
          if (checkDiv == "hba1c") {
            hba1cerror = 1;
          }
          if (checkDiv == "hba1c2" || hba1cerror == 1) {
            $("#hba1cDiv").attr(
              "class",
              "form-group has-error " + "has-feedback"
            );
          }
        } else {
          if ($("#" + checkDiv).hasClass("hidedosage") == false) {
            $("#" + checkDiv).attr(
              "class",
              "col-xs-3 has-error " + "has-feedback"
            );
          }
          $("#" + checkDiv).append(
            '<span id="' +
            checkDiv +
            'Span" ' +
            'class="glyphicon glyphicon-warning-sign ' +
            'form-control-feedback extra-top-padding"></span>'
          );
        }
      } else if (checkValue < 0) {
        if (Drug == 0) {
          if ($("#" + checkDiv + "Div").hasClass("hidethis") == false) {
            $("#" + checkDiv + "Div").attr(
              "class",
              "form-group has-error " + "has-feedback"
            );
          }
          $("#" + checkDiv + "Div2").append(
            '<span id="' +
            checkDiv +
            'Span" ' +
            'class="glyphicon glyphicon-warning-sign ' +
            'form-control-feedback"></span>'
          );
          if (checkDiv == "hba1c") {
            hba1cerror = 1;
          }
          if (checkDiv == "hba1c2" || hba1cerror == 1) {
            $("#hba1cDiv").attr(
              "class",
              "form-group has-error " + "has-feedback"
            );
          }
        } else {
          if ($("#" + checkDiv).hasClass("hidedosage") == false) {
            $("#" + checkDiv).attr(
              "class",
              "col-xs-3 has-error " + "has-feedback"
            );
          }
          $("#" + checkDiv).append(
            '<span id="' +
            checkDiv +
            'Span" ' +
            'class="glyphicon glyphicon-warning-sign ' +
            'form-control-feedback extra-top-padding"></span>'
          );
        }
      } else {
        if (Drug == 0) {
          if ($("#" + checkDiv + "Div").hasClass("hidethis") == false) {
            $("#" + checkDiv + "Div").attr("class", "form-group");
          }
          $("#" + checkDiv + "Span").remove();
          if (checkDiv == "hba1c") {
            hba1cerror = 0;
          }
          if (checkDiv == "hba1c2" && hba1cerror == 0) {
            $("#hba1cDiv").attr("class", "form-group");
          }
        } else {
          if ($("#" + checkDiv).hasClass("hidedosage") == false) {
            $("#" + checkDiv).attr("class", "col-xs-3");
          }
          $("#" + checkDiv + "Span").remove();
        }
      }
      return hba1cerror;
    }
    checkNumericPositive(
      xmlSafe(document.LKAform.skrea.value),
      "S-Krea",
      "skrea",
      0
    );
    checkNumericPositive(
      xmlSafe(document.LKAform.pituus.value),
      "Pituus",
      "pituus",
      0
    );
    checkNumericPositive(
      xmlSafe(document.LKAform.paino.value),
      "Paino",
      "paino",
      0
    );
    checkNumericPositive(
      xmlSafe(document.LKAform.verenpaineSystolinen.value),
      "Verenpaine: Systolinen",
      "verenpaineSystolinen",
      0
    );
    checkNumericPositive(
      xmlSafe(document.LKAform.verenpaineDiastolinen.value),
      "Verenpaine: Diastolinen",
      "verenpaineDiastolinen",
      0
    );
    checkNumericPositive(
      xmlSafe(document.LKAform.kolesteroli.value),
      "Kokonaiskolesteroli",
      "kolesteroli",
      0
    );
    checkNumericPositive(
      xmlSafe(document.LKAform.HDLkolesteroli.value),
      "HDL-kolesteroli",
      "HDLkolesteroli",
      0
    );
    checkNumericPositive(
      xmlSafe(document.LKAform.triglyseridit.value),
      "Triglyseridit",
      "triglyseridit",
      0
    );
    checkNumericPositive(
      xmlSafe(document.LKAform.LDLkolesteroli.value),
      "LDL-kolesteroli",
      "LDLkolesteroli",
      0
    );
    checkNumericPositive(
      xmlSafe(document.LKAform.paastoverensokeri.value),
      "Paastoverensokeri",
      "paastoverensokeri",
      0
    );
    hba1cerror = checkNumericPositive(
      xmlSafe(document.LKAform.hba1c.value),
      "HbA1c",
      "hba1c",
      0,
      hba1cerror
    );
    hba1cerror = checkNumericPositive(
      xmlSafe(document.LKAform.hba1c2.value),
      "HbA1c",
      "hba1c2",
      0,
      hba1cerror
    );
    checkNumericPositive(xmlSafe(document.LKAform.inr.value), "INR", "inr", 0);
    checkNumericPositive(
      xmlSafe(document.LKAform.hemoglobiini.value),
      "Hemoglobiini",
      "hemoglobiini",
      0
    );
    checkNumericPositive(
      xmlSafe(document.LKAform.valkosolut.value),
      "Valkosolut",
      "valkosolut",
      0
    );
    checkNumericPositive(
      xmlSafe(document.LKAform.verihiutaleet.value),
      "Verihiutaleet",
      "verihiutaleet",
      0
    );
    checkNumericPositive(
      xmlSafe(document.LKAform.alat.value),
      "ALAT",
      "alat",
      0
    );
    checkNumericPositive(
      xmlSafe(document.LKAform.kalium.value),
      "Kalium",
      "kalium",
      0
    );
    checkNumericPositive(
      xmlSafe(document.LKAform.natrium.value),
      "Natrium",
      "natrium",
      0
    );
    checkNumericPositive(xmlSafe(document.LKAform.tsh.value), "TSH", "tsh", 0);
    checkNumericPositive(
      xmlSafe(document.LKAform.cualb.value),
      "cU-Alb tai nU-Alb",
      "cualb",
      0
    );
    checkNumericPositive(
      xmlSafe(document.LKAform.dualb.value),
      "dU-Alb",
      "dualb",
      0
    );
    checkNumericPositive(
      xmlSafe(document.LKAform.ualbkre.value),
      "U-AlbKre",
      "ualbkre",
      0
    );
    for (var i = 1; i <= limit2; i++) {
      if (document.getElementById("drugDailyDosage_" + i)) {
        checkNumericPositive(
          xmlSafe(document.getElementById("drugDailyDosage_" + i).value),
          "KokonaispÃ¤ivÃ¤annos",
          "drugUnitDiv_" + i,
          1
        );
      }
    }
    $("#drugSearchSpan").remove();
    if (
      typeof document.getElementById("drugCodeDiv_1") == "undefined" ||
      document.getElementById("drugCodeDiv_1") == null
    ) {
      $("#drugSearchDiv").attr(
        "class",
        "form-group has-error " + "has-feedback"
      );
      $("#drugSearchDiv2").append(
        '<span id="drugSearchSpan"class="glyphicon ' +
        'glyphicon-warning-sign form-control-feedback"></span>'
      );
    } else {
      $("#drugSearchDiv").attr("class", "form-group");
      $("#drugSearchSpan").remove();
    }
  }
}

//This will be done when page is loaded.
$(document).ready(function () {

  console.log(
    "Document ready - " +
    new Date().getHours() +
    ":" +
    new Date().getMinutes() +
    ":" +
    new Date().getSeconds() +
    "." +
    new Date().getMilliseconds()
  );

  //Get form values from querystring. Querystring values fetched from server to integrationResults variable.
  if (window.integrationResults) {
    if (window.integrationResults.birthyear) {
      document.getElementById("datepicker").value =
        window.integrationResults.birthyear;
    }
    if (window.integrationResults.gender) {
      if (window.integrationResults.gender == "1") {
        document.getElementById("gender1").checked = true;
      }
      if (window.integrationResults.gender == "2") {
        document.getElementById("gender2").checked = true;
      }
    }
    if (window.integrationResults.krea) {
      document.getElementById("skrea").value = window.integrationResults.krea;
    }
    if (window.integrationResults.organization) {
      document.getElementById("organization").value = window.integrationResults.organization;
    }
    else {
      document.getElementById("organization").value = 'lkatp';
    }
    if (window.integrationResults.result[0]) {
      if (window.integrationResults.result[0].data) {
        for (
          var i = 0;
          window.integrationResults.result[0].data.length > i;
          i++
        ) {
          var unitForInput = "";
          if (window.integrationResults.result[0].data[i].unit) {
            unitForInput = window.integrationResults.result[0].data[i].unit;
          }
          var vnr = "";
          if (typeof window.integrationResults.result[0].data[i].vnr !== 'undefined') {
            vnr = window.integrationResults.result[0].data[i].vnr[0];
          }
          addTextInputDrug(
            "drugDiv",
            "lÃ¤Ã¤kettÃ¤",
            "lÃ¤Ã¤kkeen nimi",
            "drugName",
            "drugDiv2",
            "lÃ¤Ã¤kkeen ATC-koodi",
            "drugCode",
            "drugDiv3",
            "lÃ¤Ã¤kkeen vahvuus",
            "drugStrength",
            "drugDiv4",
            "lÃ¤Ã¤kkeen yksikkÃ¶",
            "drugUnit",
            "drugDiv5",
            "KokonaispÃ¤ivÃ¤annos",
            "drugDailyDosage",
            "drugDiv6",
            "lÃ¤Ã¤kkeen antoreitti",
            "drugRoute",
            "drugCode2",
            window.integrationResults.result[0].data[i].title,
            window.integrationResults.result[0].data[i].atc,
            vnr,
            unitForInput,
            window.integrationResults.result[0].data[i].product,
            window.integrationResults.result[0].data[i].strength
          );
        }
      }
    }
    if (window.integrationResults.search) {
      var TPvnrarray = window.integrationResults.search.split(",");
      var showMissingVNR = true;
      for (var i = 0; TPvnrarray.length > i; i++) {
        showMissingVNR = true;
        TPvnrarray[i] = TPvnrarray[i].replace("vnr:", "");
        if (window.integrationResults.result[0]) {
          if (window.integrationResults.result[0].data[0]) {
            for (
              var j = 0;
              window.integrationResults.result[0].data.length > j;
              j++
            ) {
              if (typeof window.integrationResults.result[0].data[j].vnr !== 'undefined') {
                for (
                  var k = 0;
                  window.integrationResults.result[0].data[j].vnr.length > k;
                  k++
                ) {
                  if (
                    TPvnrarray[i] ==
                    window.integrationResults.result[0].data[j].vnr[k]
                  ) {
                    showMissingVNR = false;
                  }
                }
              }
            }
          }
        }
        if (showMissingVNR == true) {
          alert("VNR-koodia '" + TPvnrarray[i] + "' ei lÃ¶ytynyt.");
        }
      }
    }
  }

  // Disable all form fields if user does not have rights (rights are checked in LKA Body)
  if (document.getElementById("norightstoview") !== null) {
    $("input").attr("disabled", "disabled");
  }

  // Enable bootstrap tooltips
  $("[data-toggle='tooltip']").tooltip();

  // Set up bloodhound - DRUGS
  console.log(
    "Setting up bloodhound for drugs - " +
    new Date().getHours() +
    ":" +
    new Date().getMinutes() +
    ":" +
    new Date().getSeconds() +
    "." +
    new Date().getMilliseconds()
  );
  var engine = new Bloodhound({
    name: "suggestions",
    limit: 10,
    datumTokenizer: function (d) {
      return Bloodhound.tokenizers.whitespace(d.value);
    },
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    remote: {
      url: "/terveysportti/laake.lka.hakemistoLaake?p_haku=%QUERY",
      rateLimitWait: 200,
      filter: function (data) {
        if (data[1] && data[1][0]) {
          initFetch(data[1][0], "Fetch");
        } else {
          initFetch(data[0], "Fetch");
        }
        return $.map(data[1], function (v) {
          return {
            value: v
          };
        });
      }
    }
  });
  // Init engine - DRUGS
  engine.initialize();
  // Setup UI, focus to element - DRUGS
  $("#p_haku").typeahead(
    {
      highlight: false
    },
    {
      name: "tp",
      source: engine.ttAdapter()
    }
  );
  // Listen to events - DRUGS
  $("#p_haku")
    .on("typeahead:autocompleted", function (ev, datum, dataset) {
      initFetch(datum.value, "Autocompleted");
    })
    .on("typeahead:cursorchanged", function (ev, datum, dataset) {
      initFetch(datum.value, "Cursor");
    })
    .on("typeahead:selected", function (ev, datum, dataset) {
      initFetch(datum.value, "Selected");
    })
    .on("keypress", function (event) {
      if (event.keyCode == 13) {
        console.log(
          "Getting drug information while user types - " +
          new Date().getHours() +
          ":" +
          new Date().getMinutes() +
          ":" +
          new Date().getSeconds() +
          "." +
          new Date().getMilliseconds()
        );
        initFetch(this.value, "Enter");
      }
    })
    .on("keyup", function (event) {
      if (this.value == "") {
        console.log(
          "Empty drug search - " +
          new Date().getHours() +
          ":" +
          new Date().getMinutes() +
          ":" +
          new Date().getSeconds() +
          "." +
          new Date().getMilliseconds()
        );
        initFetch(this.value, "Empty");
      }
    })
    .on("input", function (event) {
      if (this.value == "") {
        console.log(
          "Empty drug search - " +
          new Date().getHours() +
          ":" +
          new Date().getMinutes() +
          ":" +
          new Date().getSeconds() +
          "." +
          new Date().getMilliseconds()
        );
        initFetch(this.value, "Empty");
      }
    });

  // Set up bloodhound - DIAGNOSIS
  console.log(
    "Setting up bloodhound for diagnosis - " +
    new Date().getHours() +
    ":" +
    new Date().getMinutes() +
    ":" +
    new Date().getSeconds() +
    "." +
    new Date().getMilliseconds()
  );
  var engineDiag = new Bloodhound({
    name: "suggestions",
    limit: 10,
    datumTokenizer: function (d) {
      return Bloodhound.tokenizers.whitespace(d.value);
    },
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    remote: {
      url: "/terveysportti/laake.lka.hakemistoIcd?p_haku=%QUERY",
      rateLimitWait: 200,
      filter: function (data) {
        if (data[1] && data[1][0]) {
          initFetchDiag(data[1][0], "Fetch");
        } else {
          initFetchDiag(data[0], "Fetch");
        }
        return $.map(data[1], function (v) {
          return {
            value: v
          };
        });
      }
    }
  });
  // Init engine - DIAGNOSIS
  engineDiag.initialize();
  // Setup UI, focus to element- DIAGNOSIS
  $("#p_haku2").typeahead(
    {
      highlight: false
    },
    {
      name: "tp",
      source: engineDiag.ttAdapter()
    }
  );
  // Listen to events - DIAGNOSIS
  $("#p_haku2")
    .on("typeahead:autocompleted", function (ev, datum, dataset) {
      initFetchDiag(datum.value, "Autocompleted");
    })
    .on("typeahead:cursorchanged", function (ev, datum, dataset) {
      initFetchDiag(datum.value, "Cursor");
    })
    .on("typeahead:selected", function (ev, datum, dataset) {
      initFetchDiag(datum.value, "Selected");
    })
    .on("keypress", function (event) {
      if (event.keyCode == 13) {
        console.log(
          "Getting diagnosis information while user types - " +
          new Date().getHours() +
          ":" +
          new Date().getMinutes() +
          ":" +
          new Date().getSeconds() +
          "." +
          new Date().getMilliseconds()
        );
        initFetchDiag(this.value, "Enter");
      }
    })
    .on("keyup", function (event) {
      if (this.value == "") {
        console.log(
          "Empty diagnosis search - " +
          new Date().getHours() +
          ":" +
          new Date().getMinutes() +
          ":" +
          new Date().getSeconds() +
          "." +
          new Date().getMilliseconds()
        );
        initFetchDiag(this.value, "Empty");
      }
    });

  //Fetching results for both drugs and diagnosis
  var prev;
  var db = $.debounce(300, false, function () {
    fetchResults(prev);
  });
  var dbDiag = $.debounce(300, false, function () {
    fetchResultsDiag(prev);
  });

  // Fetch results - DRUGS
  function initFetch(value, type) {
    console.log(
      "initFetch started - " +
      new Date().getHours() +
      ":" +
      new Date().getMinutes() +
      ":" +
      new Date().getSeconds() +
      "." +
      new Date().getMilliseconds()
    );
    $("#hakuValmisteetTitle").show();
    $("#hakuValmisteet").show();
    // Check value
    if (value == "") {
      $("#results").hide();
      console.log(
        "initFetch value is empty - " +
        new Date().getHours() +
        ":" +
        new Date().getMinutes() +
        ":" +
        new Date().getSeconds() +
        "." +
        new Date().getMilliseconds()
      );
      return;
    }
    // Check what has been fetched before
    if (value && prev != value && value.length > 1) {
      // Remember this
      prev = value;
      console.log(
        "Function db is going to be executed - " +
        new Date().getHours() +
        ":" +
        new Date().getMinutes() +
        ":" +
        new Date().getSeconds() +
        "." +
        new Date().getMilliseconds()
      );
      db();
    }
  }

  // Fetch results - DIAGNOSIS
  function initFetchDiag(value, type) {
    console.log(
      "initFetchDiag started - " +
      new Date().getHours() +
      ":" +
      new Date().getMinutes() +
      ":" +
      new Date().getSeconds() +
      "." +
      new Date().getMilliseconds()
    );
    $("#hakuDiagnoositTitle").show();
    $("#hakuDiagnoosit").show();
    // Check value
    if (value == "") {
      $("#results").hide();
      console.log(
        "initFetchDiag value is empty - " +
        new Date().getHours() +
        ":" +
        new Date().getMinutes() +
        ":" +
        new Date().getSeconds() +
        "." +
        new Date().getMilliseconds()
      );
      return;
    }
    // Check what has been fetched before
    if (value && prev != value && value.length > 1) {
      // Remember this
      prev = value;
      console.log(
        "Function dbDiag is going to be executed - " +
        new Date().getHours() +
        ":" +
        new Date().getMinutes() +
        ":" +
        new Date().getSeconds() +
        "." +
        new Date().getMilliseconds()
      );
      dbDiag();
    }
  }

  var formSent = "N";
  $("#LKAmodal").modal({ show: true });
  $("#root").hide();
  $("#frontpage_article").show();
  $("footer").show();
  $("#hakuValmisteetTitle").hide();
  $("#hakuDiagnoositTitle").hide();
  $("#openBtn").hide();
  $("#loadingDiv").hide();
  toggleGenderFields();
  validateForm(formSent);
  $("#gender1").change(function () {
    toggleGenderFields();
  });
  $("#gender2").change(function () {
    toggleGenderFields();
  });
  $("#datepicker").change(function () {
    toggleGenderFields();
  });
  toggleAdvancedFields();
  $("#toggleAdvanced").change(function () {
    toggleAdvancedFields();
  });
  //Action triggered by pressing submit button
  $("#looking-like-submit-button").click(function () {
    console.time("Validating form and generating xml took time");
    console.log(
      "Modal window closed - " +
      new Date().getHours() +
      ":" +
      new Date().getMinutes() +
      ":" +
      new Date().getSeconds() +
      "." +
      new Date().getMilliseconds()
    );
    formSent = "Y";
    validateForm(formSent);
    $("#root").hide();
    $("#frontpage_article").show();
    $("footer").show();
    //XML generation and form input validation must be successful
    //before form is sent.
    if (generateXMLmessage() == true) {
      //get LKA results to iframe.
      document.LKAform.submit();
      console.log(
        "iFrame updated with fresh LKA results - " +
        new Date().getHours() +
        ":" +
        new Date().getMinutes() +
        ":" +
        new Date().getSeconds() +
        "." +
        new Date().getMilliseconds()
      );
      $("#loadingDiv").show();
      setTimeout(function () {
        $("#root").show();
        $("#loadingDiv").hide();
      }, 3000);
      $("#openBtn").show();
      $("#frontpage_article").hide();
      $("#LKA").hide();
      $("footer").hide();
    } else {
      console.log(
        "Function generateXMLmessage did not return true. " +
        "Not showing LKA results from EBMeDS engine - " +
        new Date().getHours() +
        ":" +
        new Date().getMinutes() +
        ":" +
        new Date().getSeconds() +
        "." +
        new Date().getMilliseconds()
      );
      formSubmitted = "";
      $("#root").hide();
      $("#frontpage_article").show();
      $("footer").show();
      $("#LKA").show();
      $("#openBtn").hide();
      var allEmpty = true;
      $(":input:text").each(function (index, element) {
        if (element.value !== "") {
          allEmpty = false;
        }
      });
      if (allEmpty == false) {
        $("#LKAmodal").modal({ show: true });
      }
    }
  });
  //Action triggered by pressing edit data button
  $("#openBtn").click(function () {
    console.time("Display form and hide iframe");
    $("#root").hide();
    $("#frontpage_article").show();
    $("#LKA").show();
    $("footer").show();
  });
  //Running form validation real time.
  $("#LKAform").on("keyup change", "input, select, textarea", function () {
    validateForm(formSent);
  });
  //Checkbox (basic/advanced view) that has glyphicon symbols
  $(".glyphy").click(function (e) {
    if ($(e.target).is("input")) {
      $(this)
        .find(".glyphicon")
        .toggleClass("glyphicon-minus glyphicon-plus");
    }
  });
  //Reset also drugs and diagnoses when user clears the form with reset button.
  $("#resetThis").click(function () {
    if (confirm("Haluatko varmasti tyhjentÃ¤Ã¤ lomakkeen?")) {
      console.log(
        "Webform reset button pressed. " +
        "Removing hardcoded webform field and dynamic fields (drugs and diagnosis) - " +
        new Date().getHours() +
        ":" +
        new Date().getMinutes() +
        ":" +
        new Date().getSeconds() +
        "." +
        new Date().getMilliseconds()
      );
      this.form.reset();
      for (var i = 0; i <= limit2; i++) {
        for (var j = 0; j <= limit2; j++) {
          if ($("#drugNameDiv_" + j).length > 0) {
            removeDrug(j, limit2);
          }
        }
      }
      for (var i = 0; i <= limit; i++) {
        for (var j = 0; j <= limit; j++) {
          if ($("#indicationCodeDiv_" + j).length > 0) {
            removeIndication(j);
          }
        }
      }
      return false;
    } else {
    }
  });
  setTimeout(function () {
    $('[data-spy="scroll"]').each(function () {
      var $spy = $(this).scrollspy("refresh");
    });
  }, 1000);
});