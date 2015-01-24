(function (uonmap, $, undefined) {
	//public properties
	uonmap.container = {};
	uonmap.currentLocationMarker = {};
	uonmap.activeMarker = null;
	uonmap.icons = {};
	uonmap.tileSources = [
		{
			provider:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
			name:"esri", 
            attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
        },
        {
        	provider:'http://nls-0.tileserver.com/nls/{z}/{x}/{y}.jpg',
        	name:'nls',
        	attribution:'Hostorical maps from 1919-1947 National Library Scotland'
        }


		
	]
	//private properties
	var MapIcon = {};
	var markers = {};
	var leaflet = {};
	var self = {};
	var settings = {};
	var zoom = {};
	var center = {};
    var boundaries = [];

	/*
	 * Set default and optional values of map
	 * Determine initial zoom and center as well as tile resolution
	 * Initialize L.Map, L.Icon(s), current location marker etc
	 **/
	uonmap.init = function(options) {
		self = this;
		var defaults = {
			zoom: 14, //default zoom (roughly fits uni park to 360x480px)
			container: "map",
			center: new L.LatLng(52.939534, -1.19708),
			styleId: 52661, //campus1 by Mike Gardner
			iconUrls: {
				standard: '/img/marker_main_sml_red.png'
			}
		};
		settings = $.extend({}, defaults, options);

		//Icon prototype object
		MapIcon = L.Icon.extend({
			iconUrl: '',
			shadowUrl: '',
			iconSize: new L.Point(32, 37),
			iconAnchor: new L.Point(16, 37),
			popupAnchor: new L.Point(0, -30)
		});

		//assign icon hash

        for(var icon in settings.iconUrls)
        {
            if (settings.iconUrls.hasOwnProperty(icon)) {
                result = settings.iconUrls[icon];
                uonmap.icons[icon] = new MapIcon({iconUrl: result});

            }

        }


		//detect retina display
		if(window.devicePixelRatio >= 2) {
			this.styleId += "@2x";
		}

		//default setup 
		 var Esri_WorldTopoMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
        });

		 

		 var nls = L.tileLayer('http://nls-0.tileserver.com/nls/{z}/{x}/{y}.jpg');


		//launch map
		leaflet = new L.Map(settings.container);
		self.container = "#"+settings.container;
		leaflet.addLayer(nls);

		//center to default position if no markers are shown
		leaflet.setView(settings.center, settings.zoom);

		$(document).trigger('uonmaploaded');
	}

	uonmap.destroy = function() {
		//clean up DOM tree by setting up a new map div
		var cleanContainer = $("<div></div>").attr("id", $(self.container).attr("id"));
		parent = $(self.container).parent();
		$(self.container).remove();
		parent.append(cleanContainer);

		//clean up object variables (but not functions)
		$(Object.keys(this)).each(function() {
			if(typeof self[this] == 'object') {
				self[this] == {};
			}
		});
	}

	uonmap.fire = function(eventName, content) {
		leaflet.fire(eventName, content);
	}

	uonmap.setCenter = function(geoString) {
		var latlng = extractLatLng(geoString);
		if(latlng) {
			center = latlng;
			leaflet.panTo(latlng);
		}
	}

	uonmap.getCenter = function() {
		return leaflet.getCenter();
	}

	uonmap.getBounds = function() {
		return leaflet.getBounds();
	}

	uonmap.setZoom = function(zoomLevel) {
		leaflet.setZoom(zoomLevel);
	}

	uonmap.getZoom = function() {
		return leaflet.getZoom();
	}

	/*
	 * Instead of using a single active marker, this could be extended to use a L.LayerGroup when
	 * there is a the need for handling multiple active/visible markers
	 **/
	uonmap.showMarker = function(geoString) {
		var marker = this.getMarker(geoString);
		if(marker) {
			this.hideMarker();
			this.activeMarker = marker;
			leaflet.addLayer(marker);
			leaflet.setView(marker.getLatLng(), marker.options.zoom);
		}
	}

	/*
	 * Hides visible markers and sets active marker to null
	 **/
	uonmap.hideMarker = function() {
		if(this.activeMarker) {
			leaflet.removeLayer(this.activeMarker);
			this.activeMarker = null;
		}
	}

	/*
	 * Creates marker and adds it to marker array (if not already there)
	 * @param geoString comma delimited lat,lng for location of marker
	 * @param options object sent to L.Marker constructor (see createMarker)
	 * @return marker at geoString position (newly created or found in array)
	 **/
	uonmap.addMarker = function(geoString, options) {
		var marker = this.getMarker(geoString);
		if(!marker) {
			var latlng = extractLatLng(geoString);
			if(latlng) {
				marker = createMarker(latlng, options);
				markers[geoString] = marker;
			}
		}
		return marker;
	}

	/*
	 * Searches through marker array for a marker at a specific geographic position
	 * @param geoString for marker
	 * @return marker at position or null if none found
	 **/
	uonmap.getMarker = function(geoString) {
		return markers[geoString];
	}

	/*
	 * Returns the total number of created markers (visible or not)
	 **/
	uonmap.markerCount = function() {
		return Object.keys(markers).length;
	}

	uonmap.geoJson = function(data) {
		var gj = L.geoJson(data, {
			pointToLayer: function (feature, latlong) {
				return L.marker(latlong, {icon: uonmap.icons.standard});
			},
			onEachFeature: function (feature, layer) {
				layer.bindPopup(feature.properties.html);
				if (feature.properties.open) {
					layer.openPopup();
				}
			}
		});
		gj.addTo(leaflet);
		leaflet.fitBounds(gj.getBounds(), {paddingTopLeft: [10,10], paddingBottomRight: [25,25]});
		uonmap.setZoom((uonmap.getZoom() > 13) ? 13 : uonmap.getZoom());
	}

    uonmap.addBoundaries = function(){
        $.ajaxSetup({cache:false});
        var jqxhr = $.getJSON( "../../js/boundary_county.json", function(json) {


            var count=0;
            $.each(json, function(key, val) {

                var coordinates = [];
                    $.each(json[key]["polygon"], function(index, value) {

                        coordinates.push(extractLatLng(value));

                    });
                var name = json[key]["name"];

                var href= getCountyName(name)[0]["shire"];

                boundaries[count]=new Object();
                boundaries[count][name] = L.polyline(coordinates, {color: '#51717F',weight:4,fillColor:'#333',fillOpacity:0.5}).addTo(leaflet);

                var bounds = boundaries[count][name].getBounds();

                var countyIcon = new L.DivIcon({html:name+"&nbsp;",className:"county-icon"});
                boundaries[count]["marker"]= createMarker(bounds.getCenter(),{icon:countyIcon}).addTo(leaflet);
                boundaries[count]["marker"].on('click',function(e){
                    window.location.href='../../browse/'+href;
                })

                count++;
            });

            leaflet.on('zoomend',function(){
                var zoomlevel = uonmap.getZoom()
                if(zoomlevel < 7){

                    $(".county-icon").css("font-size","0px");

                }
                else{
                    $(".county-icon").css("font-size","150%");
                };

            });

            function getCountyName(name)
            {

                var county =
                    [{"code":"BD","shire":"Bedfordshire"},
                        {"code":"BRK","shire":"Berkshire"},
                        {"code":"BK","shire":"Buckinghamshire"},
                        {"code":"C","shire":"Cambridgeshire"},
                        {"code":"CH","shire":"Cheshire"},
                        {"code":"CU","shire":"Cumberland"},
                        {"code":"CO","shire":"Cornwall"},
                        {"code":"D","shire":"Devon"},
                        {"code":"DO","shire":"Dorset"},
                        {"code":"DB","shire":"Derbyshire"},
                        {"code":"DU","shire":"Durham"},
                        {"code":"ES","shire":"Essex"},
                        {"code":"GL","shire":"Gloucestershire"},
                        {"code":"HMP","shire":"Hampshire"},
                        {"code":"HU","shire":"Huntingdonshire"},
                        {"code":"HRT","shire":"Hertfordshire"},
                        {"code":"LEI","shire":"Leicestershire"},
                        {"code":"L","shire":"Lincolnshire"},
                        {"code":"LNC","shire":"Lancashire"},
                        {"code":"MX","shire":"Middlesex"},
                        {"code":"NF","shire":"Norfolk"},
                        {"code":"NTH","shire":"Northamptonshire"},
                        {"code":"NT","shire":"Nottinghamshire"},
                        {"code":"O","shire":"Oxfordshire"},
                        {"code":"RU","shire":"Rutland"},
                        {"code":"SFK","shire":"Suffolk"},
                        {"code":"SA","shire":"Shropshire"},
                        {"code":"SX","shire":"Sussex"},
                        {"code":"ST","shire":"Staffordshire"},
                        {"code":"SR","shire":"Surrey"},
                        {"code":"WA","shire":"Warwickshire"},
                        {"code":"W","shire":"Wiltshire"},
                        {"code":"WE","shire":"Westmorland"},
                        {"code":"WO","shire":"Worcestershire"},
                        {"code":"YE","shire":"East Riding of Yorkshire"},
                        {"code":"YN","shire":"North Riding of Yorkshire"},
                        {"code":"YW","shire":"West Riding of Yorkshire"},
                        ];

                return $.grep(county, function (e) {
                        return e.code == name;
                });
            }

        })
            .error(function(e) {
                console.log( "error");
                console.log(e);
            })

    }


    uonmap.removeBoundaries = function()
    {

            for(i in leaflet._layers) {
                if(leaflet._layers[i]._path != undefined) {
                    try {
                        leaflet.removeLayer(leaflet._layers[i]);
                    }
                    catch(e) {
                        console.log("problem removing boundary " + e + leaflet._layers[i]);
                    }
                }
            }

            for(var label in boundaries)
            {
                leaflet.removeLayer(boundaries[label]["marker"]);
            }

    }

    uonmap.changeTiles = function(tiles){

    	

	 var tiledetails =  $.grep( uonmap.tileSources, function( i ) {
		  return i.name == tiles;
		});
	 
	 var provider = 
	    	L.tileLayer(tiledetails[0].provider, {
	            attribution: tiledetails[0].attribution
	        });

		

    	leaflet.addLayer(provider);	
        

    }

    /*
     * Creates a marker and a bound popup to a location
     * Uses markup in .popup-prototype to create the popup
     * @param latlng: a L.LatLng object for marker location (required)
     * @param options: options that will be forwarded to Marker constructor
     *					popupText: the text that will be used on popup
     *					href: if set, the a.popup-prototype will be used and the href set to this value
     *					icon: (forwarded to new Marker())
     * @return the created L.Marker object or null on failure
     **/
	function createMarker(latlng, options) {
		if(latlng) {
			var defaults = {
				zoom: 17
			};
			options = $.extend({}, defaults, options);
			marker = new L.Marker(latlng, options);

			//set location text as popup button text
			if(options.popupText) {
				if(options.href) {
					var popupClone = $("a.popup-prototype").clone();
					popupClone.attr('href', options.href);
				} else {
					var popupClone = $("span.popup-prototype").clone();
				}
				popupClone.removeClass('popup-prototype');
				popupClone.find('.ui-btn-text').text(options.popupText);
				var popupHtml = $('<div />').append(popupClone).html();
				marker.bindPopup(popupHtml, { closeButton: false });
			}
			return marker;
		}
		return null;
	}

	/*
	 * Turns a comma-delimited string of latitude longitude
	 * into a Leaflet.LatLng object
	 * @return LatLng or null on error
	 **/
	function extractLatLng(geoString) {
		if(geoString && geoString.indexOf(',') >= 0) {
			var latlng = geoString.split(',',2);
			lat = Number(latlng[0]);
			lng = Number(latlng[1]);
			if(isNaN(lat) || isNaN(lng)) {
				return null;
			} else {
				return new L.LatLng(lat, lng);
			}
		} else {
			return null;
		}
	}

   

})(window.uonmap = window.uonmap || {}, jQuery);


//load the object 
uonmap.init();



