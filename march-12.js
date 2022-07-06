var drawingTools = Map.drawingTools();

// create polygon of prescribed fire
var map1 = ui.Map();
map1.drawingTools().setLinked(true);
Map.setCenter(-120.66, 38.91)

//*******************************************************************************************
//                            BEGIN ANIMATION FOR MAR 12


// GOES-16
ee.ImageCollection('NOAA/GOES/16/MCMIPF')  // Full Disk
ee.ImageCollection('NOAA/GOES/16/MCMIPC')  // CONUS 
ee.ImageCollection('NOAA/GOES/16/MCMIPM')  // Mesoscale
// GOES-17
ee.ImageCollection('NOAA/GOES/17/MCMIPF')  // Full Disk
ee.ImageCollection('NOAA/GOES/17/MCMIPC')  // CONUS
ee.ImageCollection('NOAA/GOES/17/MCMIPM')  // Mesoscale

// GOES-16
ee.ImageCollection('NOAA/GOES/16/FDCF')  // Full Disk
ee.ImageCollection('NOAA/GOES/16/FDCC')  // CONUS
// GOES-17
ee.ImageCollection('NOAA/GOES/17/FDCF')  // Full Disk
ee.ImageCollection('NOAA/GOES/17/FDCC')  // CONUS

// Applies scaling factors.
var applyScaleAndOffset = function(img) {
  var getFactorImg = function(factorNames) {
    var factorList = img.toDictionary().select(factorNames).values();
    return ee.Image.constant(factorList);
  };
  var scaleImg = getFactorImg(['CMI_C.._scale']);
  var offsetImg = getFactorImg(['CMI_C.._offset']);
  var scaled = img.select('CMI_C..').multiply(scaleImg).add(offsetImg);
  return img.addBands({srcImg: scaled, overwrite: true});
};

// Adds a synthetic green band.
var addGreenBand = function(img) {
  var green = img.expression({
    expression: 'CMI_GREEN = 0.45 * red + 0.10 * nir + 0.45 * blue',
    map: {
      blue: img.select('CMI_C01'),
      red: img.select('CMI_C02'),
      nir: img.select('CMI_C03')
    }
  });
  return img.addBands(green);
};

// Scales select bands for visualization.
var scaleForVis = function(img) {
  return img.select(['CMI_C01', 'CMI_GREEN', 'CMI_C02', 'CMI_C03', 'CMI_C05'])
              .resample('bicubic')
              .log10()
              .interpolate([-1.6, 0.176], [0, 1], 'clamp')
              .unmask(0)
              .set('system:time_start', img.get('system:time_start'));
};

// Wraps previous functions.
var processForVis = function(img) {
  return scaleForVis(addGreenBand(applyScaleAndOffset(img)));
};

// Get CMI image collection and process it for visualization.
var geosVisCol = ee.ImageCollection('NOAA/GOES/17/MCMIPF')
                     .filterDate('2022-03-12T10:00', '2022-03-13T02:00')
                     .map(processForVis);

// Set display parameters and render the animation.
var visParams = {
  bands: ['CMI_C02', 'CMI_GREEN', 'CMI_C01'],
  min: 0,
  max: 0.8,
  gamma: 0.8,
  dimensions: 600,
  framesPerSecond: 10,
  region: wantedZoom,
  crs: 'EPSG:3857'
};

print(ui.Thumbnail(geosVisCol, visParams));

// Change display bands to false color.
visParams.bands = ['CMI_C05', 'CMI_C03', 'CMI_GREEN'];
print(ui.Thumbnail(geosVisCol, visParams));

// Get the fire/hotspot characterization dataset.
var fdcCol = ee.ImageCollection('NOAA/GOES/17/FDCF')
                 .filterDate('2022-03-12T10:00', '2022-03-13T02:00');

// Identify fire-detected pixels of medium to high confidence.
var fireMaskCodes = [10, 30, 11, 31, 12, 32, 13, 33, 14, 34, 15, 35];
var confVals = [1.0, 1.0, 0.9, 0.9, 0.8, 0.8, 0.5, 0.5, 0.3, 0.3, 0.1, 0.1];
var defaultConfVal = 0;
var fdcVisCol = fdcCol.map(function(img) {
  var confImg = img.remap(fireMaskCodes, confVals, defaultConfVal, 'Mask');
  return confImg.gte(0.3).selfMask()
                  .set('system:time_start', img.get('system:time_start'));
});

// Join the fire collection to the CMI collection. 
var joinFilter = ee.Filter.equals({
  leftField: 'system:time_start',
  rightField: 'system:time_start'
});
var joinedCol = ee.Join.saveFirst('match')
                         .apply(geosVisCol, fdcVisCol, joinFilter);
                         
                         

// Establish fire perimeter and add to images
// var polygonPerimeter = fire_perimeter.perimeter({'maxError': 1});
// print(polygonPerimeter)


// Overlay visualized fire pixels on corresponding visualized CMI image. 
var cmiFdcVisCol = ee.ImageCollection(joinedCol.map(function(img) {
  
  var cmi = ee.Image(img).visualize({
    bands: ['CMI_C02', 'CMI_GREEN', 'CMI_C01'],
    min: 0,
    max: 0.8,
    gamma: 0.8,
  });
  
  var fdc = ee.Image(img.get('match')).visualize({
    palette: ['ff5349'],
    min: 0,
    max: 1,
    opacity: 0.7
  });
  
  //var perim = ee.Image(fire_perimeter).visualize();
  
  return cmi.blend(fdc).set('system:time_start', img.get('system:time_start'));
}));

// Set display parameters and render the animation.
var cmiFdcVisParams = {
  dimensions: 600,
  framesPerSecond: 10,
  region: wantedZoom, //prevZoom
  crs: 'EPSG:3857'
  
};

print("Cropped view:");
print(ui.Thumbnail(cmiFdcVisCol, cmiFdcVisParams));

/// IMPORT ADDITIONAL LAYERS

// Let’s define the image collection we are working with by writing this command.
// We are creating a new variable 'image' that will come from the L8 collection we have imported

 print("Image collection found in range:")
 print(ee.Image(L9.filterDate("2022-03-01", "2022-03-11").filterBounds(ROI).sort("CLOUD_COVER")))

    var image = ee.Image(L9  // We will then include a filter to get only images in the date range we are interested in

    
 // We will then include a filter to get only images in the date range we are interested in
    .filterDate("2022-02-20", "2022-03-11")
    
 // Next we include a geographic filter to narrow the search to images at the location of our ROI point
    .filterBounds(ROI)
    
 // Next we will also sort the collection by a metadata property, in our case cloud cover is a very useful one
    .sort("CLOUD_COVER") 
    
 // Now lets select the first image out of this collection - i.e. the most cloud free image in the date range
    .first());
    
 // And let's print the image to the console.
    print("A L8 scene:", image);   
    
    print(image.date());
    
 // Define visualization parameters in a JavaScript dictionary for true colour rendering. 
 // Bands 4,3, and 2 are needed for RGB (true colour composite).
 
 // WARNING: may require gamma correction
    var trueColour = {
        bands: ["SR_B6", "SR_B5", "SR_B4"], // modify for L9
        // original bands: 4,3,2
        // testing: 5,4,3; 6,5,4
        min: 5000,
        max: 12000
        };   
        
 // Centre the scene to the ROI
 Map.centerObject(ROI, 12);

 // Add the image to the map, using the visualization parameters.
  Map.addLayer(image, trueColour, "true-colour image");
  
//*******************************************************************************************
//                             TO DO

  // iterate over L9 bands to find best resolution + contrast w post
  // see study for additional earth engine measurements 
  // add polygon to thumbnail to visualize location + time stamp
  // compare/constrast FIRMS
  // calculate burn detection

//===========================================================================================
//             BURN SEVERITY MAPPING USING THE NORMALIZED BURN RATIO (NBR)
//===========================================================================================
// Normalized Burn Ratio will be applied to imagery from before and after a wild fire. By
// calculating the difference afterwards (dNBR) Burn Severity is derived, showing the spatial
// impact of the disturbance. Imagery used in this process comes from either Sentinel-2 or 
// Landsat 8.
//===========================================================================================

//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
//                                    RUN A DEMO (optional)

// If you would like to run an example of mapping burn severity you can use the predefined 
// geometry below as well as the other predefined parameter settings. The code will take you
// to Empredado, Chile where wildfires devasted large forested areas in January and February 
// of 2017. 
// --> Remove the comment-symbol (//) below to so Earth Engine recognizes the polygon.

//var geometry = ee.Geometry.Polygon([ [ [ -72.435883, -35.540058 ], [ -72.431499, -35.544763 ], [ -72.426375, -35.544077 ], [ -72.424671, -35.539961 ], [ -72.423897, -35.533738 ], [ -72.427985, -35.534038 ], [ -72.431896, -35.530179 ], [ -72.437491, -35.53002 ], [ -72.440437, -35.527437 ], [ -72.444927, -35.525227 ], [ -72.444293, -35.522331 ], [ -72.433256, -35.514318 ], [ -72.424906, -35.509559 ], [ -72.414699, -35.509016 ], [ -72.407876, -35.504213 ], [ -72.402089, -35.499796 ], [ -72.394356, -35.497516 ], [ -72.389394, -35.488496 ], [ -72.382101, -35.484537 ], [ -72.376473, -35.483862 ], [ -72.370793, -35.481939 ], [ -72.365708, -35.482081 ], [ -72.353893, -35.479495 ], [ -72.344741, -35.47975 ], [ -72.341638, -35.478587 ], [ -72.332675, -35.483415 ], [ -72.320215, -35.477513 ], [ -72.316775, -35.480522 ], [ -72.306029, -35.479152 ], [ -72.301453, -35.479277 ], [ -72.293792, -35.478654 ], [ -72.251728, -35.508528 ], [ -72.248369, -35.513615 ], [ -72.247737, -35.523209 ], [ -72.248498, -35.529435 ], [ -72.246188, -35.535326 ], [ -72.245506, -35.543673 ], [ -72.243163, -35.548733 ], [ -72.231825, -35.558198 ], [ -72.23094, -35.561553 ], [ -72.226918, -35.56291 ], [ -72.227561, -35.566224 ], [ -72.223113, -35.569674 ], [ -72.22323, -35.572586 ], [ -72.22343, -35.577577 ], [ -72.226209, -35.583332 ], [ -72.221184, -35.585133 ], [ -72.214532, -35.584478 ], [ -72.209506, -35.586277 ], [ -72.209606, -35.588773 ], [ -72.203545, -35.590184 ], [ -72.200097, -35.59319 ], [ -72.194214, -35.586267 ], [ -72.193014, -35.581719 ], [ -72.18613, -35.575239 ], [ -72.17897, -35.574595 ], [ -72.16969, -35.584834 ], [ -72.173583, -35.593059 ], [ -72.176048, -35.60382 ], [ -72.18497, -35.610247 ], [ -72.187715, -35.615171 ], [ -72.184774, -35.618164 ], [ -72.181208, -35.618258 ], [ -72.175342, -35.624659 ], [ -72.169229, -35.62482 ], [ -72.167881, -35.629436 ], [ -72.159844, -35.632562 ], [ -72.153286, -35.6344 ], [ -72.150229, -35.63448 ], [ -72.146939, -35.641645 ], [ -72.146132, -35.647079 ], [ -72.141742, -35.652191 ], [ -72.138321, -35.656028 ], [ -72.13812, -35.663945 ], [ -72.126176, -35.645517 ], [ -72.092, -35.645568 ], [ -72.085535, -35.649898 ], [ -72.084659, -35.653668 ], [ -72.084836, -35.658244 ], [ -72.078497, -35.665902 ], [ -72.081174, -35.669165 ], [ -72.083835, -35.672011 ], [ -72.033842, -35.67245 ], [ -72.037521, -35.675272 ], [ -72.039224, -35.679809 ], [ -72.038951, -35.686062 ], [ -72.041117, -35.689339 ], [ -72.042773, -35.692628 ], [ -72.0429, -35.695957 ], [ -72.047138, -35.700013 ], [ -72.050309, -35.702848 ], [ -72.055409, -35.702718 ], [ -72.058533, -35.704305 ], [ -72.061147, -35.705904 ], [ -72.059218, -35.708868 ], [ -72.065651, -35.711351 ], [ -72.067506, -35.712413 ], [ -72.071994, -35.711189 ], [ -72.073439, -35.713371 ], [ -72.077573, -35.714745 ], [ -72.079938, -35.717273 ], [ -72.082713, -35.718682 ], [ -72.087216, -35.717826 ], [ -72.091747, -35.71771 ], [ -72.095061, -35.721323 ], [ -72.099053, -35.719001 ], [ -72.101843, -35.720779 ], [ -72.103117, -35.718527 ], [ -72.108935, -35.716527 ], [ -72.112603, -35.717542 ], [ -72.114314, -35.714908 ], [ -72.118672, -35.710357 ], [ -72.122224, -35.708415 ], [ -72.128817, -35.703066 ], [ -72.133713, -35.700719 ], [ -72.138228, -35.700231 ], [ -72.141939, -35.702354 ], [ -72.143005, -35.706394 ], [ -72.146219, -35.70742 ], [ -72.145853, -35.709649 ], [ -72.150909, -35.711366 ], [ -72.155965, -35.713082 ], [ -72.161898, -35.714036 ], [ -72.166531, -35.716503 ], [ -72.175577, -35.715895 ], [ -72.183909, -35.720113 ], [ -72.191113, -35.718812 ], [ -72.197382, -35.716796 ], [ -72.201459, -35.716688 ], [ -72.204267, -35.718832 ], [ -72.202543, -35.721097 ], [ -72.204414, -35.722527 ], [ -72.222641, -35.724629 ], [ -72.227261, -35.726724 ], [ -72.235083, -35.729473 ], [ -72.238932, -35.734917 ], [ -72.24067, -35.733021 ], [ -72.245489, -35.728822 ], [ -72.249357, -35.72354 ], [ -72.25428, -35.721927 ], [ -72.252846, -35.720117 ], [ -72.253193, -35.717518 ], [ -72.253028, -35.713454 ], [ -72.254297, -35.711201 ], [ -72.259189, -35.708849 ], [ -72.260352, -35.704009 ], [ -72.26704, -35.701239 ], [ -72.269079, -35.695636 ], [ -72.272158, -35.693333 ], [ -72.276672, -35.69284 ], [ -72.281246, -35.693825 ], [ -72.286258, -35.694428 ], [ -72.289096, -35.697309 ], [ -72.296826, -35.697837 ], [ -72.299889, -35.695164 ], [ -72.303904, -35.693574 ], [ -72.30712, -35.694595 ], [ -72.310712, -35.693757 ], [ -72.314619, -35.689581 ], [ -72.31495, -35.686613 ], [ -72.317015, -35.681748 ], [ -72.32, -35.677227 ], [ -72.322548, -35.673089 ], [ -72.32735, -35.674682 ], [ -72.33262, -35.6787 ], [ -72.339437, -35.683091 ], [ -72.34615, -35.684986 ], [ -72.349331, -35.687812 ], [ -72.355587, -35.690969 ], [ -72.362742, -35.691185 ], [ -72.366785, -35.69024 ], [ -72.371548, -35.69427 ], [ -72.375996, -35.690814 ], [ -72.383994, -35.686842 ], [ -72.391534, -35.684131 ], [ -72.394996, -35.681535 ], [ -72.398494, -35.679771 ], [ -72.403081, -35.679641 ], [ -72.409038, -35.675725 ], [ -72.411586, -35.675653 ], [ -72.418087, -35.672554 ], [ -72.421583, -35.670789 ], [ -72.426063, -35.668163 ], [ -72.428451, -35.664348 ], [ -72.435916, -35.659971 ], [ -72.437177, -35.65369 ], [ -72.438983, -35.648225 ], [ -72.444623, -35.648897 ], [ -72.45003, -35.644162 ], [ -72.453614, -35.644475 ], [ -72.458199, -35.644344 ], [ -72.460111, -35.641374 ], [ -72.45944, -35.637646 ], [ -72.454293, -35.636545 ], [ -72.450834, -35.639142 ], [ -72.447617, -35.635487 ], [ -72.444069, -35.636005 ], [ -72.44247, -35.634386 ], [ -72.446366, -35.63011 ], [ -72.443712, -35.627688 ], [ -72.450503, -35.619583 ], [ -72.450413, -35.617503 ], [ -72.437995, -35.613279 ], [ -72.43729, -35.608719 ], [ -72.432582, -35.605939 ], [ -72.441554, -35.57737 ], [ -72.437778, -35.572481 ], [ -72.437582, -35.567907 ], [ -72.436315, -35.562114 ], [ -72.437558, -35.555416 ], [ -72.437362, -35.550842 ], [ -72.435007, -35.543414 ], [ -72.435883, -35.540058 ] ] ]);

// Now hit Run to start the demo! 
// Do not forget to delete/outcomment this geometry before creating a new one!
//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

//*******************************************************************************************
//                             SELECT YOUR OWN STUDY AREA   

// Use the polygon-tool in the top left corner of the map pane to draw the shape of your 
// study area. Single clicks add vertices, double-clicking completes the polygon.
// **CAREFUL**: Under 'Geometry Imports' (top left in map pane) uncheck the 
//                geometry box, so it does not block the view on the imagery later.

//*******************************************************************************************
//                                     SET TIME FRAME

// Set start and end dates of a period BEFORE the fire. Make sure it is long enough for 
// Sentinel-2 to acquire an image (repitition rate = 5 days). Adjust these parameters, if
// your ImageCollections (see Console) do not contain any elements.
var prefire_start = '2022-01-20';   
var prefire_end = '2022-02-20';

// Now set the same parameters for AFTER the fire.
var postfire_start = '2022-03-13';
var postfire_end = '2022-05-28';

//*******************************************************************************************
//                            SELECT A SATELLITE PLATFORM

// Consider details of each mission below to choose the data suitable for your needs.

// Landsat 8                             |  Sentinel-2 (A&B)
//-------------------------------------------------------------------------------------------
// launched:        February 11th, 2015  |  June 23rd, 2015 & March 7th, 2017
// repitition rate: 16 days              |  5 day (since 2017)
// resolution:      30 meters            |  10 meters 
// advantages:      longer time series   |  9 times higher spatial detail
//                  smaller export file  |  higher chance of cloud-free images

// SELECT one of the following:   'L8'  or 'S2' 

var platform = 'Sentinel-2 MSI: MultiSpectral Instrument, Level-2A';               // <--- assign your choice to the platform variable

//*******************************************************************************************
//---->>> DO NOT EDIT THE SCRIPT PAST THIS POINT! (unless you know what you are doing) <<<---
//------------------->>> NOW HIT 'RUN' AT THE TOP OF THE SCRIPT! <<<-------------------------
//--> THE FINAL BURN SEVERITY PRODUCT WILL READY FOR DOWNLOAD ON THE RIGHT (UNDER TASKS) <---

//*******************************************************************************************


//---------------------------------- Translating User Inputs --------------------------------

// Print Satellite platform and dates to console
// if (platform == 'S2' | platform == 's2') {
  // var ImCol = 'COPERNICUS/S2';
 //  var pl = 'Sentinel-2';
// } else {
  // var ImCol = 'LANDSAT/LC08/C01/T1_SR';
  // var pl = 'Landsat 8';
// }

var ImCol = 'COPERNICUS/S2_SR';
var pl = 'Sentinel-2';

print(ee.String('Data selected for analysis: ').cat(pl));
print(ee.String('Fire incident occurred between ').cat(prefire_end).cat(' and ').cat(postfire_start));

// Location
var area = ee.FeatureCollection(wantedZoom);

// Set study area as map center.
Map.centerObject(area);

//----------------------- Select Landsat imagery by time and location -----------------------

var imagery = ee.ImageCollection(ImCol);

// In the following lines imagery will be collected in an ImageCollection, depending on the
// location of our study area, a given time frame and the ratio of cloud cover.
var prefireImCol = ee.ImageCollection(imagery
    // Filter by dates.
    .filterDate(prefire_start, prefire_end)
    // Filter by location.
    .filterBounds(area));
    
// Select all images that overlap with the study area from a given time frame 
// As a post-fire state we select the 25th of February 2017
var postfireImCol = ee.ImageCollection(imagery
    // Filter by dates.
    .filterDate(postfire_start, postfire_end)
    // Filter by location.
    .filterBounds(area));

// Add the clipped images to the console on the right
print("Pre-fire Image Collection: ", prefireImCol); 
print("Post-fire Image Collection: ", postfireImCol);

//------------------------------- Apply a cloud and snow mask -------------------------------

// Function to mask clouds from the pixel quality band of Sentinel-2 SR data.
function maskS2sr(image) {
  // Bits 10 and 11 are clouds and cirrus, respectively.
  var cloudBitMask = ee.Number(2).pow(10).int();
  var cirrusBitMask = ee.Number(2).pow(11).int();
  // Get the pixel QA band.
  var qa = image.select('QA60');
  // All flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));
  // Return the masked image, scaled to TOA reflectance, without the QA bands.
  return image.updateMask(mask)
      .copyProperties(image, ["system:time_start"]);
}

// Function to mask clouds from the pixel quality band of Landsat 8 SR data.
function maskL8sr(image) {
  // Bits 3 and 5 are cloud shadow and cloud, respectively.
  var cloudShadowBitMask = 1 << 3;
  var cloudsBitMask = 1 << 5;
  var snowBitMask = 1 << 4;
  // Get the pixel QA band.
  var qa = image.select('pixel_qa');
  // All flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudShadowBitMask).eq(0)
      .and(qa.bitwiseAnd(cloudsBitMask).eq(0))
      .and(qa.bitwiseAnd(snowBitMask).eq(0));
  // Return the masked image, scaled to TOA reflectance, without the QA bands.
  return image.updateMask(mask)
      .select("B[0-9]*")
      .copyProperties(image, ["system:time_start"]);
}

// Apply platform-specific cloud mask
if (platform == 'S2' | platform == 's2') {
  var prefire_CM_ImCol = prefireImCol.map(maskS2sr);
  var postfire_CM_ImCol = postfireImCol.map(maskS2sr);
} else {
  var prefire_CM_ImCol = prefireImCol.map(maskL8sr);
  var postfire_CM_ImCol = postfireImCol.map(maskL8sr);
}

//----------------------- Mosaic and clip images to study area -----------------------------

// This is especially important, if the collections created above contain more than one image
// (if it is only one, the mosaic() does not affect the imagery).

var pre_mos = prefireImCol.mosaic().clip(area);
var post_mos = postfireImCol.mosaic().clip(area);

var pre_cm_mos = prefire_CM_ImCol.mosaic().clip(area);
var post_cm_mos = postfire_CM_ImCol.mosaic().clip(area);

// Add the clipped images to the console on the right
print("Pre-fire True Color Image: ", pre_mos); 
print("Post-fire True Color Image: ", post_mos);

//------------------ Calculate NBR for pre- and post-fire images ---------------------------

// Apply platform-specific NBR = (NIR-SWIR2) / (NIR+SWIR2)
if (platform == 'S2' | platform == 's2') {
  var preNBR = pre_cm_mos.normalizedDifference(['B8', 'B12']);
  var postNBR = post_cm_mos.normalizedDifference(['B8', 'B12']);
} else {
  var preNBR = pre_cm_mos.normalizedDifference(['B5', 'B7']);
  var postNBR = post_cm_mos.normalizedDifference(['B5', 'B7']);
}


// Add the NBR images to the console on the right
//print("Pre-fire Normalized Burn Ratio: ", preNBR); 
//print("Post-fire Normalized Burn Ratio: ", postNBR);

//------------------ Calculate difference between pre- and post-fire images ----------------

// The result is called delta NBR or dNBR
var dNBR_unscaled = preNBR.subtract(postNBR);

// Scale product to USGS standards
var dNBR = dNBR_unscaled.multiply(1000);

// Add the difference image to the console on the right
print("Difference Normalized Burn Ratio: ", dNBR);

//==========================================================================================
//                                    ADD LAYERS TO MAP

// Add boundary.
Map.addLayer(area.draw({color: 'ffffff', strokeWidth: 5}), {},'Study Area');

//---------------------------------- True Color Imagery ------------------------------------

// Apply platform-specific visualization parameters for true color images
if (platform == 'S2' | platform == 's2') {
  var vis = {bands: ['B4', 'B3', 'B2'], max: 2000, gamma: 1.5};
} else {
  var vis = {bands: ['B4', 'B3', 'B2'], min: 0, max: 4000, gamma: 1.5};
}

// Add the true color images to the map.
Map.addLayer(pre_mos, vis,'Pre-fire image');
Map.addLayer(post_mos, vis,'Post-fire image');

// Add the true color images to the map.
Map.addLayer(pre_cm_mos, vis,'Pre-fire True Color Image - Clouds masked');
Map.addLayer(post_cm_mos, vis,'Post-fire True Color Image - Clouds masked');

//--------------------------- Burn Ratio Product - Greyscale -------------------------------

var grey = ['white', 'black'];

// Remove comment-symbols (//) below to display pre- and post-fire NBR seperately
//Map.addLayer(preNBR, {min: -1, max: 1, palette: grey}, 'Prefire Normalized Burn Ratio');
//Map.addLayer(postNBR, {min: -1, max: 1, palette: grey}, 'Postfire Normalized Burn Ratio');

Map.addLayer(dNBR, {min: -1000, max: 1000, palette: grey}, 'dNBR greyscale');

//------------------------- Burn Ratio Product - Classification ----------------------------

// Define an SLD style of discrete intervals to apply to the image.
var sld_intervals =
  '<RasterSymbolizer>' +
    '<ColorMap type="intervals" extended="false" >' +
      '<ColorMapEntry color="#ffffff" quantity="-500" label="-500"/>' +
      '<ColorMapEntry color="#7a8737" quantity="-250" label="-250" />' +
      '<ColorMapEntry color="#acbe4d" quantity="-100" label="-100" />' +
      '<ColorMapEntry color="#0ae042" quantity="100" label="100" />' +
      '<ColorMapEntry color="#fff70b" quantity="270" label="270" />' +
      '<ColorMapEntry color="#ffaf38" quantity="440" label="440" />' +
      '<ColorMapEntry color="#ff641b" quantity="660" label="660" />' +
      '<ColorMapEntry color="#a41fd6" quantity="2000" label="2000" />' +
    '</ColorMap>' +
  '</RasterSymbolizer>';

// Add the image to the map using both the color ramp and interval schemes.
Map.addLayer(dNBR.sldStyle(sld_intervals), {}, 'dNBR classified');

// Seperate result into 8 burn severity classes
var thresholds = ee.Image([-1000, -251, -101, 99, 269, 439, 659, 2000]);
var classified = dNBR.lt(thresholds).reduce('sum').toInt();

//==========================================================================================
//                              ADD BURNED AREA STATISTICS

// count number of pixels in entire layer
var allpix =  classified.updateMask(classified);  // mask the entire layer
var pixstats = allpix.reduceRegion({
  reducer: ee.Reducer.count(),               // count pixels in a single class
  geometry: area,
  scale: 30
  });
var allpixels = ee.Number(pixstats.get('sum')); // extract pixel count as a number


// create an empty list to store area values in
var arealist = [];

// create a function to derive extent of one burn severity class
// arguments are class number and class name
var areacount = function(cnr, name) {
 var singleMask =  classified.updateMask(classified.eq(cnr));  // mask a single class
 var stats = singleMask.reduceRegion({
  reducer: ee.Reducer.count(),               // count pixels in a single class
  geometry: area,
  scale: 30
  });
var pix =  ee.Number(stats.get('sum'));
var hect = pix.multiply(900).divide(10000);                // Landsat pixel = 30m x 30m --> 900 sqm
var perc = pix.divide(allpixels).multiply(10000).round().divide(100);   // get area percent by class and round to 2 decimals
arealist.push({Class: name, Pixels: pix, Hectares: hect, Percentage: perc});
};

// severity classes in different order
var names2 = ['NA', 'High Severity', 'Moderate-high Severity',
'Moderate-low Severity', 'Low Severity','Unburned', 'Enhanced Regrowth, Low', 'Enhanced Regrowth, High'];

// execute function for each class
for (var i = 0; i < 8; i++) {
  areacount(i, names2[i]);
  }

print('Burned Area by Severity Class', arealist, '--> click list objects for individual classes');

//==========================================================================================
//                                    ADD A LEGEND

// set position of panel
var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 15px'
  }});
 
// Create legend title
var legendTitle = ui.Label({
  value: 'dNBR Classes',
  style: {fontWeight: 'bold',
    fontSize: '18px',
    margin: '0 0 4px 0',
    padding: '0'
    }});
 
// Add the title to the panel
legend.add(legendTitle);
 
// Creates and styles 1 row of the legend.
var makeRow = function(color, name) {
 
      // Create the label that is actually the colored box.
      var colorBox = ui.Label({
        style: {
          backgroundColor: '#' + color,
          // Use padding to give the box height and width.
          padding: '8px',
          margin: '0 0 4px 0'
        }});
 
      // Create the label filled with the description text.
      var description = ui.Label({
        value: name,
        style: {margin: '0 0 4px 6px'}
      });
 
      // return the panel
      return ui.Panel({
        widgets: [colorBox, description],
        layout: ui.Panel.Layout.Flow('horizontal')
      })};
 
//  Palette with the colors
var palette =['7a8737', 'acbe4d', '0ae042', 'fff70b', 'ffaf38', 'ff641b', 'a41fd6', 'ffffff'];
 
// name of the legend
var names = ['Enhanced Regrowth, High','Enhanced Regrowth, Low','Unburned', 'Low Severity',
'Moderate-low Severity', 'Moderate-high Severity', 'High Severity', 'NA'];
 
// Add color and and names
for (var i = 0; i < 8; i++) {
  legend.add(makeRow(palette[i], names[i]));
  }  
 
// add legend to map (alternatively you can also print the legend to the console)
Map.add(legend);
