const prefix = "./";
var mapStyle = [{
    "elementType": "labels",
    "stylers": [{
      "visibility": "off"
    }]
  },
  {
    "featureType": "administrative",
    "elementType": "geometry",
    "stylers": [{
      "visibility": "off"
    }]
  },
  {
    "featureType": "administrative.land_parcel",
    "stylers": [{
      "visibility": "off"
    }]
  },
  {
    "featureType": "administrative.neighborhood",
    "stylers": [{
      "visibility": "off"
    }]
  },
  {
    "featureType": "landscape.natural",
    "elementType": "geometry.fill",
    "stylers": [{
      "color": "#F2EFDF"
    }]
  },
  {
    "featureType": "poi",
    "stylers": [{
      "visibility": "off"
    }]
  },
  {
    "featureType": "road",
    "stylers": [{
      "visibility": "off"
    }]
  },
  {
    "featureType": "road",
    "elementType": "labels.icon",
    "stylers": [{
      "visibility": "off"
    }]
  },
  {
    "featureType": "transit",
    "stylers": [{
      "visibility": "off"
    }]
  },
  {
    "featureType": "water",
    "elementType": "geometry.fill",
    "stylers": [{
      "color": "#91D9D9"
    }]
  }
];

function backgroundLoad(obj, json_url) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', prefix + json_url);
  xhr.onload = function() {
    Object.assign(obj, JSON.parse(xhr.responseText));
  };
  xhr.send();
}

var map;
// Global read only data variables.
var stateNames = {};
var countyPolicies = {};
var statePolicies = {};
var countyCases = {};
var stateCases = {};


function initMap() {
  // load the map
  map = new google.maps.Map(document.getElementById('map'), {
    center: {
      lat: 40,
      lng: -100
    },
    zoom: 4,
    styles: mapStyle,
    mapTypeControl: false,
    rotateControl: false,
    streetViewControl: false,
    fullscreenControl: false,
  });

  // set up the style rules and events for google.maps.Data
  map.data.setStyle(styleFeature);
  map.data.addListener('mouseover', mouseInToRegion);
  map.data.addListener('mouseout', mouseOutOfRegion);
  map.data.addListener('click', clickOnRegion);

  map.data.loadGeoJson(prefix + 'counties.json', {
    idPropertyName: 'AFFGEOID'
  });
  map.data.loadGeoJson(prefix + 'states.json', {
    idPropertyName: 'AFFGEOID'
  });
  backgroundLoad(stateNames, 'state_names.json');
  backgroundLoad(countyPolicies, 'county_policies.json');
  backgroundLoad(statePolicies, 'state_policies.json');
  backgroundLoad(countyCases, 'county_cases.json');
  backgroundLoad(stateCases, 'state_cases.json');
}

function styleFeature(feature) {
  if (feature.j.is_a_state) {
    return {
      strokeWeight: 1.2,
      zIndex: 1,
      visible: true,
      strokeColor: '#BFB59F',
      fillColor: '#F2EFDF'
    };
  }
  var strokeWeight = 0.08;
  var zIndex = 2;
  var opacity = 0.0;
  if (feature.getProperty('state') === 'hover') {
    strokeWeight = 0.8
    zIndex = 3;
    opacity = 0.8;
  }
  return {
    strokeWeight: strokeWeight,
    strokeColor: '#BFB59F',
    fillColor: '#F2C879',
    zIndex: zIndex,
    fillOpacity: opacity,
    visible: true,
  };
}


function mouseInToRegion(e) {
  // set the hover state so the setStyle function can change the border
  e.feature.setProperty('state', 'hover');
}

function mouseOutOfRegion(e) {
  // reset the hover state, returning the border to normal
  e.feature.setProperty('state', 'normal');
}


const policyIcons = {
  testing: "local_pharmacy",
  shelter: "home",
  school: "school",
  work: "work",
  event: "event",
  transport: "train",
}
const policyNames = {
  testing: "Testing",
  shelter: "Shelter-in-place",
  school: "School Closure",
  work: "Business Closure",
  event: "Public Event Cancellation",
  transport: "Public Transportation Shutdown",
}
const policies = Object.keys(policyIcons);

function policyActivity(policyName, policy) {
  const policyValue = policy[policyName];
  // Scale is either True/False or 1-2-3.
  if (policyValue === 1 || policyValue === false) {
    return "inactive";
  } else if (policyValue == 3 || policyValue === true) {
    return "active"
  } else if (policyValue == 2) {
    return "partial";
  } else {
    return "unknown";
  }
}

function makeIcon(policyName, policy) {
  const policyValue = policy[policyName];
  var colorStyle = policyActivity(policyName, policy) + "-policy";
  var i = document.createElement("i");
  i.className = "material-icons " + colorStyle;
  i.innerText = policyIcons[policyName];
  return i;
}

function displayPolicies(div, id, is_state) {
  div.innerHTML = null;
  const policy = (is_state ? statePolicies[id]: countyPolicies[id]);
  if (policy == null) {
    return false;
  }
  for (const policyDim of policies) {
    const icon = makeIcon(policyDim, policy);
    if (icon == null) continue;
    policyDiv = document.createElement("div");
    div.appendChild(policyDiv);
    text = document.createElement("span");
    text.className = "policy-line";
    policyDiv.appendChild(text);
    text.appendChild(icon);
    activityStr = policyActivity(policyDim, policy)
    text.innerHTML += policyNames[policyDim] + ":&nbsp;";
    evidence = policy[policyDim + "_url"];
    if (evidence != null && evidence != "") {
      a = document.createElement("a");
      a.href = evidence;
      a.target = "_blank";
      a.innerText = activityStr;
      text.appendChild(a);
    } else {
      text.innerHTML += activityStr;
    }
    date = policy[policyDim + "_date"];
    if (date != null && date != "") {
      text.innerHTML += "&nbsp;since&nbsp;" + date;
    }
  }
  return true;
}

function displayInfoBox(fips_id, is_state, feature) {
  policy_div = document.getElementById(is_state ? 'state-policies' : 'county-policies');
  const hasPolicies = displayPolicies(policy_div, fips_id, is_state);
  if (!hasPolicies && !is_state) {
    // Link to the form for data entry if a county has no data.
    var editText = document.createElement("a");
    var i = document.createElement("i");
    i.className = "material-icons";
    i.innerText = "create";
    editText.appendChild(i);
    editText.href = "https://docs.google.com/forms/d/e/1FAIpQLScO4B6PkJsOeVKM2_dbpFMhnXCfb89Kya9bWtKX4uUWIMev7Q/viewform?usp=pp_url&entry.1112165839=";
    editText.href += encodeURI(feature.j.name + ' County, ' + stateNames[feature.j.state_id]);
    editText.target = "_blank";
    editText.innerHTML += "Submit policy data for this county!"
    policy_div.appendChild(editText);
  }
  // Display cases count from the NYT.
  const cases = (is_state ? stateCases[fips_id]: countyCases[fips_id]);
  if (cases == null) return;
  casesDiv = document.createElement("div");
  casesDiv.className = "cases";
  policy_div.appendChild(casesDiv);
  text = document.createElement("span");
  text.className = "policy-line";
  casesDiv.appendChild(text);
  // Link to the site to credit data source.
  a = document.createElement("a");
  a.href = "https://www.nytimes.com/interactive/2020/us/coronavirus-us-cases.html";
  a.target = "_blank";
  a.innerText = "COVID-19 cases";
  text.appendChild(a);
  text.innerHTML += ":&nbsp;" + cases.cases.toLocaleString() + " (" + cases.deaths.toLocaleString() + " deaths)";
  // Display date freshness on hover.
  tooltip = document.createElement("span");
  tooltip.className = "cases-tooltip";
  tooltip.innerText = "as of " + cases.date;
  casesDiv.appendChild(tooltip);
  
}

function clickOnRegion(e) {
  const fips_id = e.feature.j.fips_id;
  const state_id = e.feature.j.state_id;
  document.getElementById("state-name").textContent = stateNames[state_id];
  document.getElementById("county-name").textContent = e.feature.j.name + ' County ';
  displayInfoBox(fips_id, false, e.feature);
  displayInfoBox(state_id, true, e.feature);
}
