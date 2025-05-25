  import { Component, OnInit, AfterViewInit, Inject, PLATFORM_ID, NgModule } from '@angular/core';
  import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, NgModel } from '@angular/forms';
  import { CommonModule, isPlatformBrowser, NgFor, NgIf, NgStyle } from '@angular/common';
  import Map from 'ol/Map.js';
  import View from 'ol/View.js';
  import TileLayer from 'ol/layer/Tile.js';
  import VectorLayer from 'ol/layer/Vector.js';
  import OSM from 'ol/source/OSM.js';
  import VectorSource from 'ol/source/Vector.js';
  import Draw from 'ol/interaction/Draw.js';
  import Modify from 'ol/interaction/Modify.js';
  import Select from 'ol/interaction/Select.js';
  import Snap from 'ol/interaction/Snap.js';
  import Graticule from 'ol/layer/Graticule';
  import ImageLayer from 'ol/layer/Image';  // ✅ Renamed to ImageLayer to avoid conflict

  import Style from 'ol/style/Style';
  import Stroke from 'ol/style/Stroke';
  import { from } from 'rxjs';
  import { log } from 'console';
  import Fill from 'ol/style/Fill';
  import { HttpClient } from '@angular/common/http';
  import { provideHttpClient } from '@angular/common/http';

  import TileWMS from 'ol/source/TileWMS';
  import Layer from 'ol/layer/Layer';
  import { fromLonLat, toLonLat, transformExtent } from 'ol/proj';
  import { Circle, LineString, Point, Polygon } from 'ol/geom';

  import CircleStyle from 'ol/style/Circle';
import Feature from 'ol/Feature';
import Text from 'ol/style/Text';
import { Vector } from 'ol/source';
import { circular } from 'ol/geom/Polygon';

import XYZ from 'ol/source/XYZ';

import {DragBox} from 'ol/interaction';
import { platformModifierKeyOnly } from 'ol/events/condition';
import { getRenderPixel } from 'ol/render';
import { BlobOptions } from 'buffer';



  type GeometryType = 'Point' | 'LineString' | 'Polygon' | 'MultiPoint' | 'MultiLineString' | 'MultiPolygon';

  @Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    standalone: true,
    imports: [FormsModule, ReactiveFormsModule, NgFor, CommonModule],

  })


  export class AppComponent implements OnInit, AfterViewInit {
    title = 'GisProject';
    map!: Map;
    vector!: VectorLayer;
    select!: Select;
    modify!: Modify;
    activeDraw: Draw | null = null;

    graticuleLayer!: Graticule | null;

    
    capabilitiesUrl = 'http://localhost:8080/geoserver/tiger/wms?service=WMS&request=GetCapabilities';
    wmsLayers: TileLayer<TileWMS>[] = [];


        baseMaps = {
          osm: new TileLayer({
            source: new OSM(),
            visible: true // only one should be visible at a time
          }),
          opentopo: new TileLayer({
            source: new XYZ({
              url: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',
              
              maxZoom: 17
            }),
            visible: true,
            
          })
      
          // Add more base maps if needed
    };

   

    

    // ✅ Correctly Defined FormGroup
    formGroup = new FormGroup({
      actionType : new FormControl('Draw'),
      drawType: new FormControl<GeometryType>('Point'), 
    });
  

    constructor(
      private http: HttpClient,
      @Inject(PLATFORM_ID) private platformId: object
    ) {}

    ngOnInit(): void {
      console.log('Initializing OpenLayers Map');
}

         aerial=new TileLayer({
            source: new XYZ({
              url: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',
             
              maxZoom: 17
            }),
            visible: true
          })


    ngAfterViewInit(): void {
      if (isPlatformBrowser(this.platformId)) {
        this.vector = new VectorLayer({
          source: new VectorSource(),
        });



        setTimeout(() => {
          this.map = new Map({
            layers: [this.selectedBasemap,
     this.vector],
            target: 'map',
            view: new View({ center: [0, 0], zoom: 4 }),
          });

          this.map.on('click', (evt: any) => {
            this.map.forEachFeatureAtPixel(evt.pixel, (feature: any) => {
              console.log("event is ", evt);
              
              const currentText = feature.get('text');
              if (currentText !== undefined) {
                this.textnew = currentText;
                this.textbox = true;
                this.editableFeature = feature;
              }
            });
          });

          this.fetchWMSLayers()

        }, 100);

       }
     
    }
   selectedBasemap: any = this.baseMaps.osm;

currentBasemap(event: any): void {
  let name = event?.target?.alt;

  let newBasemap :TileLayer<any> | null = null;

  console.log('Log for Base maps:', name);

   switch (name) {
    case 'osm':
      newBasemap = this.baseMaps.osm;
      break;

    case 'topo':
      newBasemap = this.baseMaps.opentopo;
      break;

    case 'None':
      newBasemap = null;
      break;
      default:
      return; // exit if no valid basemap
  }
   if (this.map && newBasemap) {
    this.map.getLayers().setAt(0, newBasemap);
    this.selectedBasemap = newBasemap;
  }
}


    onActionChange() {
      const { actionType, drawType } = this.formGroup.value;

      console.log('Selected Action:', actionType);
      console.log('Selected Draw Type:', drawType);

      if (actionType === 'Draw' && drawType) {
        this.setActiveDraw(drawType);
      } else if (actionType === 'Modify') {
        this.activateModify();
      }
    }


    fetchWMSLayers() {
      this.http.get(this.capabilitiesUrl, { responseType: 'text' }).subscribe((response:string) => {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(response, 'text/xml');
        const layers = xmlDoc.getElementsByTagName('Layer');

        for (let i = 1; i < layers.length; i++) {
          const nameNode = layers[i].getElementsByTagName('Name')[0];
          if (nameNode) {
            const name = nameNode.textContent;
            if (name) {
                const Layer = new TileLayer({
                source: new TileWMS({
                  url: 'http://localhost:8080/geoserver/wms', // ⬅️ Base WMS URL here
                  params: {
                    'LAYERS': name,
                    'TILED': true,
                    'VERSION': '1.3.0',
                    'FORMAT': 'image/png',
                    'TRANSPARENT': true
                  },
                  serverType: 'geoserver',
                  crossOrigin: 'anonymous'
                }),
                visible: true,
                opacity: 1
              });

              const bboxTag = layers[i].getElementsByTagName('EX_GeographicBoundingBox')[0];
        
              if (bboxTag) {
                const west = parseFloat(bboxTag.getElementsByTagName('westBoundLongitude')[0].textContent || '0');
                const east = parseFloat(bboxTag.getElementsByTagName('eastBoundLongitude')[0].textContent || '0');
                const south = parseFloat(bboxTag.getElementsByTagName('southBoundLatitude')[0].textContent || '0');
                const north = parseFloat(bboxTag.getElementsByTagName('northBoundLatitude')[0].textContent || '0');
      
                const extent4326 = [west, south, east, north];
      
                console.log('Extent in EPSG:4326:', extent4326);
      
                // Transform to EPSG:3857
                const extent3857 = transformExtent(extent4326, 'EPSG:4326', 'EPSG:3857');
                console.log('Extent in EPSG:3857:', extent3857);
                (Layer as any).layerExtent = extent3857;

              }
              console.log("layers are ",layers[i]);
              this.map.addLayer?.(Layer);
              this.wmsLayers.push(Layer)
            }
          }
        }

      console.log('Available WMS Layers:', this.wmsLayers);
      });
      
  }

  selectedLayer: string[] = []
  getlayer(event: any, layer:any){
  const IsChecked=event.target.checked
  if (IsChecked){
  console.log("You are checked");
  this.selectedLayer.push(layer);
  layer.setVisible(true);
  const extent=layer.layerExtent
  this.map.getView().fit(extent, { padding: [50, 50, 50, 50], duration: 500 });
  console.log(extent);

  }
  else{
  this.selectedLayer = this.selectedLayer.filter(l => l != layer);
  console.log("not checked");
  layer.setVisible(false);
  }
  }
  setActiveDraw(drawType: GeometryType) {
    if (this.activeDraw) {
      this.map.removeInteraction(this.activeDraw);
    }
    
    const vectorSource = this.vector.getSource() as VectorSource;
    this.activeDraw = new Draw({ source: vectorSource, type: drawType });


   
    if (drawType ){

    }
    
    if (drawType === 'LineString') {
      const img = new Image();
      img.src = '/abc1.svg'; // Ensure this path is correct
      
      img.onload = () => {
        // Create a seamless pattern function
        const createSeamlessPattern = (angle: number) => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            console.error('Could not get canvas context');
            return null;
          }
          
          // For a seamless pattern, we need proper dimensions
          // Make sure these match your SVG's actual dimensions
          const patternWidth = 20;
          const patternHeight = 9.5;
          
          // Create a larger canvas to handle rotation without clipping
          const paddingFactor = 1.5; // Add padding to avoid edge artifacts
          const maxDimension = Math.ceil(
            Math.max(patternWidth, patternHeight) * paddingFactor
          );
          
          canvas.width = maxDimension;
          canvas.height = maxDimension;
          
          // Clear canvas with transparent background
          ctx.clearRect(0, 0, maxDimension, maxDimension);
          
          // Save the context state before transformations
          ctx.save();
          
          // Move to center of canvas for rotation
          ctx.translate(maxDimension/2, maxDimension/2);
          ctx.rotate(angle);
          
          // Create a repeating pattern by drawing the image multiple times
          // to ensure there are no gaps when the pattern repeats
          const repeatX = 3; // Draw 3 copies horizontally
          const repeatY = 3; // Draw 3 copies vertically
          
          for (let x = -repeatX/2; x < repeatX/2; x++) {
            for (let y = -repeatY/2; y < repeatY/2; y++) {
              ctx.drawImage(
                img, 
                x * patternWidth - patternWidth/2, 
                y * patternHeight - patternHeight/2, 
                patternWidth, 
                patternHeight
              );
            }
          }
          
          // Restore the context state
          ctx.restore();
          
          // Create the pattern
          const pattern = ctx.createPattern(canvas, 'repeat');
          return pattern;
        };
        
        // Apply style with continuous pattern based on line orientation
        this.vector.setStyle((feature) => {
          const geometry = feature.getGeometry();
          if (!geometry) {
            return new Style({});
          }
          
          let pattern = null;
          
          if (geometry.getType() === 'LineString') {
            const lineGeometry = geometry as LineString;
            const coordinates = lineGeometry.getCoordinates();
            
            if (coordinates.length >= 2) {
              // Get the overall direction of the line
              const startPoint = coordinates[0];
              const endPoint = coordinates[coordinates.length - 1];
              
              const dx = endPoint[0] - startPoint[0];
              const dy = endPoint[1] - startPoint[1];
              
              // Calculate angle of the overall line direction
              let angle = Math.atan2(dy, dx);
              
              // Create seamless pattern with proper rotation
              pattern = createSeamlessPattern(angle);
            } else {
              pattern = createSeamlessPattern(0);
            }
          }
          
          // Fallback to a solid color if pattern creation fails
          const strokeColor = pattern || 'rgba(0, 0, 255, 1)';
          
          return new Style({
            stroke: new Stroke({
              color: strokeColor,
              width: 5,
              lineCap: 'square', // Try different line caps
              lineJoin: 'round', // Try different line joins
            }),
          });
        });
      };
    }

    
    
     this.activeDraw.on('drawend', (event) => {
        console.log('Drawing completed:', event.feature);

        const geometry = event.feature.getGeometry();

        console.log("geometry",geometry);

        if(geometry instanceof Circle) {
          // Get circle center and convert to EPSG:4326
          const center = geometry.getCenter();
          const center4326 = toLonLat(center);
          const radiusInMeters = geometry.getRadius();
          
          // Create circular polygon with proper segments
          const circlePolygon = circular(center, radiusInMeters, 64);
          
          // Get coordinates in EPSG:4326 for WFS query
          const circlePolygon4326 = circlePolygon.clone();
          circlePolygon4326.transform('EPSG:3857', 'EPSG:4326');
          
          // Build WKT from polygon coordinates
          const coordsArray = circlePolygon4326.getCoordinates()[0];
          const coordStrings = coordsArray.map((coord) => `${coord[0]} ${coord[1]}`);
          const wktPolygon = `POLYGON((${coordStrings.join(', ')}))`;
          
          console.log("WKT Polygon:", wktPolygon);
          
          // Make WFS GetFeature request
          const wfsUrl = 'http://localhost:8080/geoserver/tiger/wfs';
          
          const params = new URLSearchParams({
            service: 'WFS',
            version: '2.0.0',
            request: 'GetFeature',
            typeName: 'tiger:poi', // Make sure this matches your actual layer name
            outputFormat: 'application/json',
            srsName: 'EPSG:4326',
            cql_filter: `INTERSECTS(the_geom, ${wktPolygon})`
          });
          
          // Perform the fetch
          console.log('WFS Request URL:', wfsUrl + '?' + params.toString());
          
          fetch(wfsUrl + '?' + params.toString())
            .then(response => {
              if (!response.ok) {
                throw new Error(`Server Error: ${response.status} ${response.statusText}`);
              }
              return response.json();
            })
            .then(data => {
              console.log('Features inside circle:', data);
              
              // Add the features to the map (optional)
              if (data.features && data.features.length > 0) {
                this.displayFeaturesOnMap(data.features);
              } else {
                console.log('No features found inside the circle');
              }
            })
            .catch(error => console.error('Error querying WFS:', error));
        }

        
        
        this.handleDrawEnd(event.feature);
      });
      

      this.map.addInteraction(this.activeDraw);
      const snap = new Snap({ source: vectorSource });
      this.map.addInteraction(snap);
    }

    handleDrawEnd(feature: any) {
      console.log('Feature drawn:', feature);
    }

    displayFeaturesOnMap(features: any[]) {
      // Create a vector source and add features
      const vectorSource = new VectorSource();
      
      features.forEach(feature => {
        const olFeature = new Feature({
          geometry: new Point(fromLonLat([
            feature.geometry.coordinates[0],
            feature.geometry.coordinates[1]
          ]))
        });

        olFeature.setStyle(new Style({
          image: new CircleStyle({
            radius: 8,
            fill: new Fill({
              color: 'rgba(255, 0, 0, 0.7)'
            }),
            stroke: new Stroke({
              color: 'white',
              width: 2
            })
          })
        }));
        
        vectorSource.addFeature(olFeature);
      });

      const resultLayer = new VectorLayer({
        source: vectorSource,
        zIndex: 999 // Make sure it's on top
      });
      
      // Add the layer to the map
      this.map.addLayer(resultLayer);}


      


    activateModify() {
      this.select = new Select();
      this.map.addInteraction(this.select);

      this.modify = new Modify({ features: this.select.getFeatures() });
      this.map.addInteraction(this.modify);

      this.select.on('change:active', () => {
        this.select.getFeatures().clear();
      });
    }

    getlayers(event: any){

      if (event.target.checked){
        console.log("yeah checked");
        
      }
      else{
        console.log("didt checked");
        
      }

    }
    contextMenuVisible: boolean=false
    contextMenuPosition = { x: 0, y: 0 };
  
  selectedLayerOpacity: number = 1;

  selectedLayer1: VectorLayer<VectorSource> | null = null;


  getlayerOpacity(event: MouseEvent, layer: any) {
    event.preventDefault();

    const target = event.target as HTMLElement;
    const rect = target.getBoundingClientRect();

    // Get position relative to the parent container
    this.contextMenuPosition = {
      x: target.offsetLeft,
      y: target.offsetTop + target.offsetHeight
    };

    this.selectedLayer1 = layer;
    this.selectedLayerOpacity = layer.getOpacity();
    this.contextMenuVisible = true;
  }

  
    updateOpacity() {
      if (this.selectedLayer) {
      this.selectedLayer1?.setOpacity(this.selectedLayerOpacity);
      }
      }


      strokeColor = '#0000ff';
      strokeWidth = 2;
      fillColor = '#99ccff';

  updateLayerStyle() {
    if (this.selectedLayer1 instanceof VectorLayer) {
      const vectorLayer = this.selectedLayer1 as VectorLayer<VectorSource>;

      console.log("vector layer is:", vectorLayer);
      
      

      vectorLayer.setStyle(new Style({
        stroke: new Stroke({
          color: this.strokeColor,
          width: this.strokeWidth
        }),
        fill: new Fill({
          color: this.fillColor
        })
      }));
    }
  }
  editableFeature: any=''
  textnew :any='';
  textbox: boolean=false
  // addtext(event: any) {
  //   this.textbox = true;
  
  //   const clickHandler = (event: any) => {
  //     const coordinates = event.coordinate;
  
  //     const pointFeature = new Feature({
  //       geometry: new Point(coordinates),
  //       text: this.textnew || 'No Text' 
  //     });
  
  //     const textstyle = new Style({
  //       text: new Text({
  //         text: pointFeature.get('text'),  // <-- Use bound input value
  //         font: '14px Calibri,sans-serif',
  //         fill: new Fill({ color: '#000' }),
  //         stroke: new Stroke({ color: '#fff', width: 2 }),
  //         offsetY: -15
  //       })
  //     });
  
  //     pointFeature.setStyle(textstyle);
  
  //     const vectorLayer1 = new VectorLayer({
  //       source: new VectorSource({
  //         features: [pointFeature],
  //       }),
  //     });
  
  //     this.map.addLayer(vectorLayer1);
  
  //     // Optional: hide the input after placing text

  //    // Remove click listener after one use (optional)
  //     this.map.un('click', clickHandler);
  //   };
  
  //   this.map.on('click', clickHandler);

  //   this.map.on('click', (evt: any) => {
  //     this.map.forEachFeatureAtPixel(evt.pixel, (feature) => {
  //       const currentText = feature.get('text') || '';
  //       this.textnew = currentText;
  //       this.textbox = true;
  //       this.editableFeature = feature;
  //     });
  //   });
  // }

swipe1: any=10
 onchangesBar(event:any){

  console.log("event is ", event);
 
  

  const swipe = this.swipe1

  
  console.log("swipe is", swipe);


  this.swipe1=event?.target?.value

  console.log("new swipe1", this.swipe1)

  const map = this.map;
   this.aerial;

  this.aerial.on('prerender', (event: any)=> {
    const ctx = event.context;
    const mapSize = map.getSize();
    if (!mapSize) return;

    console.log("SW",this.swipe1 )

    const width = mapSize[0] * (this.swipe1) / 100;

    // Use pixel values directly for canvas clip
    const tl = getRenderPixel(event,[width, 0]);
    const tr = getRenderPixel(event,[mapSize[0], 0]);
    const bl = getRenderPixel(event,[width, mapSize[1]]);
    const br = getRenderPixel(event,mapSize);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(tl[0], tl[1]);
    ctx.lineTo(bl[0], bl[1]);
    ctx.lineTo(br[0], br[1]);
    ctx.lineTo(tr[0], tr[1]);
    ctx.closePath();
    ctx.clip();
  });

  this.aerial.on('postrender', function (event: any) {
    event.context.restore();
  });
  this.map.render();
}
  
  swap: boolean = false;
  
  swapTool() {
  this.swap = true

}
baseMapDiv: Boolean=false
selectMap(){

this.baseMapDiv=!this.baseMapDiv

}




  handleTextAction() {
    if (this.editableFeature) {
      // Update existing feature's text
      this.editableFeature.set('text', this.textnew);
  
      this.editableFeature.setStyle(new Style({
        text: new Text({
          text: this.textnew,
          font: '14px Calibri,sans-serif',
          fill: new Fill({ color: '#000' }),
          stroke: new Stroke({ color: '#fff', width: 2 }),
          offsetY: -15
        })
      }));
  
      this.editableFeature = null; // clear after update
      this.textnew = '';
      this.textbox = false;
    } else {
      // Start add mode
      this.textbox = true;
  
      const clickHandler = (event: any) => {
        const coordinates = event.coordinate;
  
        const pointFeature = new Feature({
          geometry: new Point(coordinates),
        });
  
        pointFeature.set('text', this.textnew);
  
        pointFeature.setStyle(new Style({
          text: new Text({
            text: this.textnew || 'No Text',
            font: '14px Calibri,sans-serif',
            fill: new Fill({ color: '#000' }),
            stroke: new Stroke({ color: '#fff', width: 2 }),
            offsetY: -15
          })
        }));
  
        const vectorLayer = new VectorLayer({
          source: new VectorSource({
            features: [pointFeature],
          }),
        });
  
        this.map.addLayer(vectorLayer);
  
        this.map.un('click', clickHandler);
        this.textbox = false;
        this.textnew = '';
      };
  
      this.map.on('click', clickHandler);
    }

    

    
  }

  
  
  
  

  






    

    getGracticule(): void {
      if (this.graticuleLayer) {
        this.map.removeLayer(this.graticuleLayer);
        this.graticuleLayer = null;
      } else {
        this.graticuleLayer = new Graticule({
          maxLines: 100,
          visible: true,
          intervals: [1],
        });
        this.map.addLayer(this.graticuleLayer);
      }
    }
  }
