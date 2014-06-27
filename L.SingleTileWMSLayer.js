L.SingleTileWMSLayer = L.ImageOverlay.extend({

  defaultWmsParams: {
    service: 'WMS',
    request: 'GetMap',
    version: '1.1.1',
    layers: '',
    styles: '',
    format: 'image/jpeg',
    transparent: false
  },

  initialize: function (url, options) {
    this._url = url
    if (url.indexOf("{s}") != -1) {
      this.options.subdomains = options.subdomains = '1234'
    }
    var wmsParams = L.extend({}, this.defaultWmsParams);

    for (var i in options) {
      if (!this.options.hasOwnProperty(i)) {
        wmsParams[i] = options[i]
      }
    }

    this.wmsParams = wmsParams

    this._isSwap = false;
    this._imageSwap = null;
    L.setOptions(this, options)
  },

  onAdd: function (map) {
    this._map = map

    var projectionKey = parseFloat(this.wmsParams.version) >= 1.3 ? 'crs' : 'srs'
    this.wmsParams[projectionKey] = map.options.crs.code

    this._bounds = map.getBounds();

    map.on('moveend', this._onViewReset, this)
    // hide on zoom
    if (map.options.zoomAnimation && L.Browser.any3d) {
      map.on('zoomanim', this._onZoomAnim, this)
    }
    // request a first image on add
    this._onViewReset()
  },

  onRemove: function (map) {
    L.ImageOverlay.prototype.onRemove.call(this, map)

    if (this._imageSwap) {
      map.getPanes().overlayPane.removeChild(this._imageSwap)
      this._imagesCreated = false
    }
    map.off('moveend', this._onViewReset, this)
    map.off('zoomanim', this._onZoomAnim, this)
  },

  _onViewReset: function () {
    this._futureBounds = this._map.getBounds()
    var map = this._map
    var crs = map.options.crs
    var nwLatLng = this._futureBounds.getNorthWest()
    var seLatLng = this._futureBounds.getSouthEast()
    var nw = crs.project(nwLatLng),
        se = crs.project(seLatLng)
    var bbox = [nw.x, se.y, se.x, nw.y].join(',')
    var url = this._url
    var size = this._map.getSize()
    this.ratio = 1.2
    size.x = parseInt(Math.round(size.x * this.ratio))
    size.y = parseInt(Math.round(size.y * this.ratio))
    this.wmsParams.width = size.x - size.x % 16
    this.wmsParams.height = size.y - size.y % 16
    var imageSrc = url + L.Util.getParamString(this.wmsParams, url) + "&bbox=" + bbox
    this.swapImage(imageSrc, this._futureBounds)
  },

  _reset: function () {
    var el = this._isSwap ? this._imageSwap : this._image
    if (!el) {
        return
    }

    var nwLatLng = this._bounds.getNorthWest()
    var seLatLng = this._bounds.getSouthEast()
    var topLeft = this._map.latLngToLayerPoint(nwLatLng)
    var bottomRight = this._map.latLngToLayerPoint(seLatLng)
    var size = bottomRight.subtract(topLeft)
    L.DomUtil.setPosition(el, topLeft)
    el.width = size.x
    el.height = size.y
  },

  _onZoomAnim: function() {
    if (this._imageSwap) {
      this._imageSwap.style.visibility = 'hidden'
    }
    if (this._image) {
      this._image.style.visibility = 'hidden'
    }
  },
  _onSwapImageLoad:function () {
    if (this._isSwap){
      this._imageSwap.style.visibility = 'hidden'
      this._image.style.visibility = ''
    } else {
      this._imageSwap.style.visibility = ''
      this._image.style.visibility = 'hidden'
    }
    this._isSwap = !this._isSwap
    this._bounds = this._futureBounds
    this._reset()
  },

  swapImage:function (src, bounds) {
    if (!this._imagesCreated){
      this._image = this._createImageSwap()
      this._imageSwap = this._createImageSwap()
      this._imagesCreated = true
    }

    if (this._isSwap){
      this._image.src = src
    } else {
      this._imageSwap.src = src
    }

    this._futureBounds = bounds
    this._reset()
  },

  _createImageSwap:function () {
    var el = L.DomUtil.create('img', 'leaflet-image-layer')
    L.Util.extend(el, {
      galleryimg: 'no',
      onselectstart: L.Util.falseFn,
      onmousemove: L.Util.falseFn,
      onload: L.Util.bind(this._onSwapImageLoad, this)
    });
    this._map.getPanes().overlayPane.appendChild(el)
    el.style.visibility = ''
    return el
  }
})

L.singleTileWMSLayer = function (url, options) {
  return new L.SingleTileWMSLayer(url, options)
}
