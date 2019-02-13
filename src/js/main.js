import jQuery from 'jquery';
import createjs from 'createjs';

window.$ = window.jQuery = jQuery;

const Treevizu = (function($) {

  $.fn.TreeVizu = function(options) {

    var defaults = {
      id: 'canvas',
      direction: 'down',
      width: 500,
      height: 500,
      viewX: 500,
      viewY: 50,
      viewBasis: 'bottom',
      controls: false,
      style: {
        fontSize: '12px',
        fontStyle: 'normal',
        fontFamily: 'Arial',
        color: '#000',
        lineHeight: null,
        lineWidth: 150,
        backgroundColor: '#F5F5F5',
        borderColor: '#000',
        borderWidth: 1,
        borderRadius: 0,
        padding: 10,
        margin: 20,
        link: {
          height: 20,
          color: '#AAA',
          opacity: 1,
          weight: 1,
        },
        label: {
          fontSize: '12px',
          fontStyle: 'normal',
          fontFamily: 'Arial',
          color: '#888',
          backgroundColor: '#FFF',
          borderWidth: 0,
          borderColor: '#AAA',
          borderWidth: 1,
          borderRadius: 5,
          maxWidth: 150,
          maxCharacters: 20,
        }
      }
    };
    var params = $.extend(true, defaults,options);

    var canvas = $('#'+params.id);
    var stage = new createjs.Stage(params.id);
    if(stage.canvas === null) console.error('Wrong canvas id');
    var root = null;
    var current = root;
    var nodes = [];
    var that = this;

    this.panX = null;
    this.panY = null;
    this.maxLevel = 0;
    this.progressive = false;

    //background
    this.background = new createjs.Shape();
    this.background.alpha = 0.5;
    this.background.cursor = 'move';
    stage.addChild(this.background);

    this.persistance = new createjs.Container();
    stage.addChild(this.persistance);

    // main container
    this.main_cont = new createjs.Container();
    stage.addChild(this.main_cont);

    // controls container
    this.controls_cont = new createjs.Container();
    stage.addChild(this.controls_cont);


    // content container
    this.boxes_cont = new createjs.Container();
    this.links_cont = new createjs.Container();
    this.labels_cont = new createjs.Container();
    this.main_cont.addChild(this.boxes_cont, this.links_cont , this.labels_cont);

    // debug container
    this.debug_cont = new createjs.Container();
    this.debug_cont.alpha = 0;
    this.main_cont.addChild(this.debug_cont);

    stage.enableMouseOver(20);


    this.init = function() {

      this.drawControls();

      this.initListeners();

    }

    this.initListeners = function() {

      var that = this;
      stage.on('pressmove', function(e) { that.movePan(e); });
      stage.on('pressup', function(e) { that.stopPan(e); });

    }

    this.draw = function() {

      if(params.direction == 'down' || params.direction == 'up') {
        this.recalculateAllWidth();
        this.standarizeAllHeight();
      }
      if(params.direction == 'left' || params.direction == 'right') {
        this.recalculateAllHeight();
        this.standarizeAllWidth();
      }

      this.drawNode(root, true);

      this.update();
    }

    this.redraw = function() {

      this.clear();
      this.draw();
    }

    this.drawControls = function() {

      //opacity 0 if not displayed
      if(params.controls === false) this.controls_cont.alpha = 0;

      let buttonSize = 30;

      this.zoomInButton = new createjs.Container();
      var bkg = new createjs.Shape();
      bkg.graphics.beginFill('#DDD').drawRect(0,0,buttonSize,buttonSize);
      var text = new createjs.Text('+', '20px arial', '#000');
      text.x = 8;
      text.y = 4;
      this.zoomInButton.x = 20;
      this.zoomInButton.y = 20;
      this.zoomInButton.cursor = 'pointer';
      this.zoomInButton.addChild(bkg, text);

      this.zoomOutButton = new createjs.Container();
      var bkg = new createjs.Shape();
      bkg.graphics.beginFill('#DDD').drawRect(0,0,buttonSize,buttonSize);
      var text = new createjs.Text('-', '20px arial', '#000');
      text.x = 10;
      text.y = 4;
      this.zoomOutButton.x = this.zoomInButton.x;
      this.zoomOutButton.y = this.zoomInButton.y + 40;
      this.zoomOutButton.cursor = 'pointer';
      this.zoomOutButton.addChild(bkg, text);

      this.controls_cont.addChild(this.zoomInButton, this.zoomOutButton);

      this.zoomInButton.on('click', that.zoomIn, that);
      this.zoomOutButton.on('click', that.zoomOut, that);

    }

    this.movePan = function(e) {

      if(this.panX === null && this.panY === null) {
        this.panX = e.stageX;
        this.panY = e.stageY;
      }

      this.main_cont.x += e.stageX - this.panX;
      this.main_cont.y += e.stageY - this.panY;

      this.panX = e.stageX;
      this.panY = e.stageY;

      this.update();
    }

    this.stopPan = function(e) {
      this.panX = null;
      this.panY = null;
    }

    this.moveTo = function(node, time = 650) {

      if(this.progressive == 'current-node') {
        this.displayOnlyCurrentNode(node);
      }
      else if(this.progressive == 'first-children') {
        this.displayOnlyFirstChildren(node);
      }
      else if(this.progressive == 'above-level') {
        this.displayAboveLevel(node.level + 1, false);
      }
      else {
        this.displayAllNodes();
      }
      this.redraw();

      // move view
      if(params.viewBasis == 'top') {
        var x = params.viewX - node.x * this.main_cont.scale;
        var y = params.viewY - node.y * this.main_cont.scale;
      }
      if(params.viewBasis == 'bottom') {
        var x = params.viewX - node.x * this.main_cont.scale;
        var y = params.viewY - (node.y + node.box.height + params.style.padding + params.style.borderWidth) * this.main_cont.scale;
      }
      createjs.Tween.get(this.main_cont).to({x: x, y: y}, time, createjs.Ease.quadInOut).on('change',this.update);

    }

    this.displayOnlyCurrentNode = function(node, display = true) {

      //hide all
      nodes.map(n => n.display = !display);
      //display node
      node.display = display;
      //display parent
      this.displayParents(node, display);
    }

    this.displayOnlyFirstChildren = function(node, display = true) {

      //hide all
      nodes.map(n => n.display = !display);
      //display node
      node.display = display;
      //display parent
      this.displayParents(node, display, true);
      //display siblings
      node.parent.children.map(n => n.display = display);
      //display first children
      node.children.map(n => n.display = display);
    }

    this.displayParents = function(node, display = true, displayChildren = false) {

      if(node.parent == undefined) return;
      //display parent
      node.parent.display = display;
      //display parent children or not
      if(displayChildren) node.parent.children.map(c => c.display = display);
      //call recursively
      this.displayParents(node.parent, display, displayChildren);
    }

    this.displayAboveLevel = function(level, display = true) {

      //hide all
      nodes.map(n => n.display = !display);
      //display node above level
      nodes.map(function(n) {
        if(n.level > level) {
          n.display = display;
        }
      });
    }

    this.displayAllNodes = function(display = true) {
      nodes.map(n => n.display = display);
    }

    this.styleParents = function(node, style, except = []) {

      //if no parent, return early
      if(node.parent == undefined) return;

      //style parent node, except if id is an exception
      if(undefined !== except.find(p => p == node.parent.meta.id)) {
        this.styleNode(node.parent, style);
      }

      //recursively call on parent node
      if(node.parent.parent !== undefined) {
        this.styleParents(node.parent, style);
      }
    }

    // set temporary node style
    this.styleNode = function(node, style) {

      // erase current node
      this.eraseNode(node);
      // extend style
      style = $.extend(true, {}, node.style, style);
      // clone node
      let newNode = this.cloneNode(node, style);
      // update array with new node
      let idx = nodes.indexOf(node);
      nodes[idx] = newNode;
      // update parent
      if(node.parent !== undefined && node.parent.children.length > 0) {
        let parent = node.parent;
        let ref = parent.children.find(c => c.meta.id === node.meta.id);
        let index = parent.children.indexOf(ref);
        newNode.parent.children[index] = newNode;
      }
      //update children
      if(node.children.length > 0) {
        node.children.map(child => child.parent = newNode);
      }


      // draw new node
      this.drawNode(newNode, true);
      this.update();
      // return new styled node
      return newNode;
    }

    this.eraseNode = function(node, ms = 0) {

      createjs.Tween.get(node.box).to({alpha: 0}, ms).call(function() {
         that.boxes_cont.removeChild(node.box);
      });

      if(node.label) {
          createjs.Tween.get(node.label).to({alpha: 0}, ms).call(function() {
            that.labels_cont.removeChild(node.label);
          });
      }

      if(node.links) {
          createjs.Tween.get(node.links).to({alpha: 0}, ms).call(function() {
            that.links_cont.removeChild(node.links);
          });
      }

    }

    this.cloneNode = function(node, style) {

      let clone = this.createNode(node.name, node.meta, style);
      clone.parent = node.parent;
      clone.level = node.level;
      clone.width = node.width;
      clone.height = node.height;
      clone.children = node.children;
      clone.childrenWidth = node.childrenWidth;
      clone.childrenHeight = node.childrenHeight;
      clone.x = node.x;
      clone.y = node.y;
      clone.display = node.display;
      return clone;
    }

    this.findNodeByName = function(name) {

      return nodes.find(n => n.name === name);
    }

    this.findNodeById = function(id) {

      return nodes.find(n => n.meta.id === id);
    }

    this.createNode = function(name, meta = {}, style) {

      var style = $.extend(true, {}, params.style, style);
      var box = new createjs.Container();
      var fontString = style.fontStyle+' '+style.fontSize+' '+style.fontFamily;
      var txt = new createjs.Text(name, fontString, style.color);
      txt.lineWidth = style.lineWidth;
      txt.lineHeight = style.lineHeight;
      txt.textBaseline = 'top';
      txt.y = style.padding/2;
      var bds = txt.getBounds();
      var width = bds.width;
      var height = txt.getMeasuredHeight();
      var rec = new createjs.Shape();
      rec.graphics.beginStroke(style.borderColor).setStrokeStyle(style.borderWidth).beginFill(style.backgroundColor).drawRoundRect(0,0,width+2*style.padding, height + 2*style.padding, style.borderRadius, style.borderRadius, style.borderRadius, style.borderRadius);
      rec.x = - width/2 - style.padding
      txt.regX = width/2;
      txt.y = style.padding;
      box.addChild(rec);
      box.addChild(txt);
      box.rec = rec;
      box.txt = txt;
      box.width = width+2*style.padding;
      box.height = height+2*style.padding;
      var center = new createjs.Shape();
      center.graphics.beginFill('red').drawCircle(0,0,3);
      center.alpha = 0;
      box.addChild(center);

      var node = {
        name: name,
        box: box,
        children: [],
        childrenWidth: 0,
        childrenHeight : 0,
        meta: meta,
        style: style,
        display: true,
      }

      if(typeof meta.clickAction === 'function') {
        box.addEventListener("click", function(event) { meta.clickAction(node); event.stopPropagation(); });
        box.cursor = 'pointer';
      }

      return node;

    }

    this.getDownCoord = function(node, parent) {

      var count = parent.children.length;
      var space = parent.childrenWidth / (count*2);
      var index = parent.children.indexOf(node);
      var coef = (index*2 + 1);
      var add = space*coef;
      return {
        x: parent.x - parent.childrenWidth/2 + add,
        y: parent.y + parent.height + params.style.margin*2
      }
    }

    this.getUpCoord = function(node, parent) {

      var count = parent.children.length;
      var space = parent.childrenWidth / (count*2);
      var index = parent.children.indexOf(node);
      var coef = (index*2 + 1);
      var add = space*coef;
      return {
        x: parent.x - parent.childrenWidth/2 + add,
        y: parent.y - parent.height - params.style.margin*2
      }
    }

    this.getLeftCoord = function(node, parent) {

      var count = parent.children.length;
      var space = parent.childrenHeight / (count*2);
      var index = parent.children.indexOf(node);
      var coef = (index*2 + 1);
      var add = space*coef;
      return {
        x: parent.x - parent.box.width - params.style.margin*2,
        y: parent.y - parent.childrenHeight/2 - node.box.height/4 + add
      }
    }

    this.getRightCoord = function(node, parent) {

      var count = parent.children.length;
      var space = parent.childrenHeight / (count*2);
      var index = parent.children.indexOf(node);
      var coef = (index*2 + 1);
      var add = space*coef;
      return {
        x: parent.x + parent.box.width + params.style.margin*2,
        y: parent.y - parent.childrenHeight/2 - node.box.height/4 + add
      }
    }

    this.drawNode = function(node, drawChildren = false) {

      //do not draw node and its children if it is invisible
      if(node.display === false) return;

      // if node has parent, calcul position from it
      if(node.parent !== undefined) {
        var parent = node.parent;
        if(params.direction == 'down')
          var coord = this.getDownCoord(node, parent);
        if(params.direction == 'up')
          var coord = this.getUpCoord(node, parent);
        if(params.direction == 'left')
          var coord = this.getLeftCoord(node, parent);
        if(params.direction == 'right')
          var coord = this.getRightCoord(node, parent);
        node.x = coord.x;
        node.y = coord.y;
      }

      // add box to stage
      var box = node.box;
      box.x = node.x;
      box.y = node.y;
      this.boxes_cont.addChild(box);

      // add debug
      var debug = new createjs.Shape();
      debug.graphics.beginStroke('red').setStrokeStyle(1).drawRect(0,0,node.childrenWidth, node.box.height);
      debug.x = box.x - node.childrenWidth/2;
      debug.y = box.y;
      this.debug_cont.addChild(debug);

      // draw link
      if(node.parent !== undefined) {
        this.drawLink(node, parent);
      }

      // draw label
      if(node.parent !== undefined && node.meta.label !== undefined && node.meta.label !== null) {
        this.drawLabel(node, parent);
      }

      // if we dont want to draw node's children, return now
      if(drawChildren === false) return;

      // draw children
      if(node.children.length > 0) {
        for(var i=0,ln=node.children.length-1; i<=ln; ++i) {
          this.drawNode(node.children[i], drawChildren);
        }
      }
    }

    this.stylePathTo = function(node, style, oldStyle = null) {

      /*
      // reset all nodes style
      oldStyle = oldStyle ? $.extend({}, node.style, oldStyle) : $.extend({}, node.style, params.style);
      nodes.map(function(n) {
        this.setNodeStyle(n, oldStyle);
      });
      this.setNodeStyle(nodes[10], oldStyle);

      // apply style to node
      style = $.extend({}, node.style, style);
      this.setNodeStyle(node, style);

      // apply style to all parents
      //this.styleParents(node, style);
    */
    }

    this.drawLink = function(node, parent) {

      var pad = params.style.link.height;

      // point where the line get out the parent box
      var out = new createjs.Point();
      // point where the line bend
      var turn1 = new createjs.Point();
      // point where the line bend
      var turn2 = new createjs.Point();
      // point where the line enter child box
      var in_ = new createjs.Point();

      if(params.direction == 'down') {
        out.x = parent.x;
        out.y = parent.y + parent.box.height;
        in_.x = node.x;
        in_.y = node.y;
        turn1.x = out.x;
        turn1.y = parent.y + parent.height + pad;
        turn2.x = in_.x;
        turn2.y = turn1.y;
      }
      if(params.direction == 'up') {
        out.x = parent.x;
        out.y = parent.y;
        in_.x = node.x;
        in_.y = node.y + node.box.height;
        turn1.x = out.x;
        turn1.y = parent.y - pad;
        turn2.x = in_.x;
        turn2.y = turn1.y;
      }
      if(params.direction == 'right') {
        out.x = parent.x + parent.box.width/2;
        out.y = parent.y + parent.box.height/2;
        in_.x = node.x - node.box.width/2;
        in_.y = node.y + node.box.height/2;
        turn1.x = out.x + pad;
        turn1.y = out.y;
        turn2.x = in_.x - pad;
        turn2.y = in_.y;
      }
      if(params.direction == 'left') {
        out.x = parent.x - parent.box.width/2;
        out.y = parent.y + parent.box.height/2;
        in_.x = node.x + node.box.width/2;
        in_.y = node.y + node.box.height/2;
        turn1.x = out.x - pad;
        turn1.y = out.y;
        turn2.x = in_.x + pad;
        turn2.y = in_.y;
      }

      // set style of the link
      var style = $.extend(true, {}, params.style.link, node.style.link);

      // draw link
      var link = new createjs.Shape();
      link.graphics.beginStroke(style.color).setStrokeStyle(style.weight)
                .moveTo(out.x, out.y)
                .lineTo(turn1.x, turn1.y)
                .lineTo(turn2.x, turn2.y)
                .lineTo(in_.x, in_.y)
      link.alpha = style.opacity;
      this.links_cont.addChild(link);
      node.link = link;
      node.linkOutPoint = out;
      node.linkTurn1Point = turn1;
      node.linkTurn2Point = turn2;
      node.linkInPoint = in_;

    }

    this.drawLabel = function(node, parent) {

      // set style of the link
      var style = $.extend(true, {}, params.style.label, node.style.label);
      var fontString = style.fontStyle+' '+style.fontSize+' '+style.fontFamily;
      var label = new createjs.Container();
      var name = node.meta.label;
      name = (name.length > style.maxCharacters)? name.substring(0, style.maxCharacters)+'...' : name;
      var text = new createjs.Text(name, fontString, style.color);
      text.maxWidth = style.maxWidth;
      var b = text.getBounds();
      var bkg = new createjs.Shape();
      bkg.graphics.beginStroke(style.borderColor).setStrokeStyle(style.borderWidth).beginFill(style.backgroundColor).drawRoundRect(-b.width/2-5, -b.height/2,b.width+10, b.height*2, style.borderRadius, style.borderRadius, style.borderRadius, style.borderRadius);
      label.addChild(bkg);
      label.addChild(text);
      label.regX = b.width/2;
      text.regX = b.width/2;
      bkg.y = -b.height/2;
      text.y = -b.height/2;
      label.x = node.linkTurn2Point.x + b.width/2;
      label.y = (node.linkTurn1Point.y + node.linkTurn2Point.y) / 2;
      this.labels_cont.addChild(label);
      node.label = label;
    }


    this.addRoot = function(name, meta = ({}), style = ({}) ) {

      var node = this.createNode(name, meta, style);
      node.x = params.width/2;
      node.y = params.style.padding;
      node.width = params.width;
      node.level = 0;
      node.children = [];
      nodes.push(node);
      return root = node;
    }

    this.addChild = function(parent, object, style = ({}) ) {

      var level = parent.level+1;
      this.maxLevel = (level > this.maxLevel)? level : this.maxLevel;
      var node = this.createNode(object.name, object.meta, style);
      node.parent = parent;
      node.level = level;
      nodes.push(node);

      parent.children.push(node);

      //recalcul children width
//      parent.width = parent.children.reduce((a,b)=> a.box.width + b.box.width);

      return node;
    }

    this.addChildren = function(parent, objects = [], style = ({}) ) {

      var level = parent.level+1;
      this.maxLevel = (level > this.maxLevel)? level : this.maxLevel;
      var children = [];
      for(var i=0,ln=objects.length-1;i<=ln;i++) {
        let obj = objects[i];
        var node = this.createNode(obj.name, style);
        node.parent = parent;
        node.level = level;
        node.meta = obj.meta;
        children.push(node);
        nodes.push(node);
      }
      parent.children = parent.children.concat(children);

      //recalcul children width
//      parent.width = parent.children.reduce((a,b)=> a.box.width + b.box.width);

      return children;
    }

    /*this.recalculateAllWidth = function() {

      let max = this.maxLevel;
      let levels = [];
      for(var i=max; i>0; i--) {
        let items = nodes.filter(n => n.level === i);
        let widths = items.map(n => n.box.width);
        let width = widths.reduce((a,b) => a + b);
        width += params.style.margin * widths.length;
        items.map(n => n.parent.childrenWidth = width);
      }
    }*/

    this.recalculateAllWidth = function() {

      let max = this.maxLevel;
      let levels = [];
      for(var i=max; i>0; i--) {
        let items = nodes.filter(n => n.level === i);
        items.map(function(n) {
          let parent = n.parent;
          let children = parent.children.filter(child => child.display === true);
          if(children.length > 0) {
            let widths = children.map(n => (n.childrenWidth == undefined || n.childrenWidth == 0)? n.box.width : n.childrenWidth);
            let width = widths.reduce((a,b) => a + b);
            width += params.style.margin * children.length;
            parent.childrenWidth = width;
          }
          else {
            parent.childrenWidth = 0;
          }
        });
      }

    }

    /*
    this.recalculateAllWidth = function() {

      var defaultWidth = params.width;
      var maxWidth = this.findMaxRowWidth();
      var baseWidth = (maxWidth > defaultWidth)? maxWidth : defaultWidth;
      root.childrenWidth = baseWidth;
      this.calculChildrenWidth(root);
    }
    */

    this.calculChildrenWidth = function(parent) {

      var newWidth = parent.childrenWidth / parent.children.length;
      parent.children.map(function(child) {
        child.childrenWidth = newWidth;
        that.calculChildrenWidth(child);
      });
    }


    this.recalculateAllHeight = function() {

      var defaultHeight = params.height;
      var maxHeight = this.findMaxRowHeight();
      var baseHeight = (maxHeight > defaultHeight)? maxHeight : defaultHeight;
      root.childrenHeight = baseHeight;
      this.calculChildrenHeight(root);
    }

    this.calculChildrenHeight = function(parent) {

      var newHeight = parent.childrenHeight / parent.children.length;
      parent.children.map(function(child) {
        child.childrenHeight = newHeight;
        that.calculChildrenHeight(child);
      });
    }

    this.standarizeAllHeight = function() {

      var maxs = [];
      for(var i=0,ln=nodes.length-1; i<=ln; ++i) {
        var node = nodes[i];
        var level = node.level;
        if(maxs[level] === undefined) maxs[level] = node.box.height;
        else {
          if(node.box.height > maxs[level]) {
            maxs[level] = node.box.height;
          }
        }
      }
      for(var i=0,ln=nodes.length-1; i<=ln; ++i) {
        var node = nodes[i];
        node.height = maxs[node.level];
      }
    }

    this.standarizeAllWidth = function() {

      //width are standarize by default
      return;
    }


    this.getTotalNodesWidth = function(nodes) {
      var w = 0;
      for(var i=0,ln=nodes.length-1; i<=ln; i++) {
        w += nodes[i].width + params.style.margin;
      }
      return w;
    }

    this.findMaxRowWidth = function() {
      var widths = [];
      for(var i=0,ln=nodes.length-1; i<=ln; ++i) {
        var node = nodes[i];
        if(widths[node.level] === undefined) widths[node.level] = node.box.width;
        else widths[node.level] += node.box.width;
      }
      return Math.max(...widths);
    }

    this.findMaxRowHeight = function() {
      var heights = [];
      for(var i=0, ln=nodes.length-1; i<=ln; i++) {
        var node = nodes[i];
        if(heights[node.level] === undefined) heights[node.level] = node.box.height;
        else heights[node.level] += node.box.height;
      }
      return Math.max(...heights);
    }

    this.isMobile = function () {

      var ua = navigator.userAgent.toLowerCase();
      if( ua.indexOf('android') > -1 ) return true;
      if( ua.indexOf('iphone') > -1 || ua.indexOf('ipad') > -1  ) return true;
      return false;
    }

    this.drawBackground = function() {

      this.background.graphics.clear().beginFill('#FFF').drawRect(0,0,params.width, params.height);
    }


    this.resize = function(width = null, height = null) {

      var width = width !== null ? width : params.width;
      var height = height !== null ? height : params.height;

      if (this.isMobile()) { //if android or ios
        //enable Touch event
        createjs.Touch.enable(stage);
      }

      var can = canvas.get(0);
      can.width = width;
      can.height = height;
      can.style.width = width+'px';
      can.style.height = height+'px';

      params.width = width;
      params.height = height;
      params.viewX = width/2;

      this.drawBackground();
      this.update();
    }


    this.clear = function() {

      this.boxes_cont.removeAllChildren();
      this.links_cont.removeAllChildren();
      this.labels_cont.removeAllChildren();
      this.update();
    }

    /*
    this.saveCanvas = function(x, y) {

      var bitmap = new createjs.Bitmap(stage.canvas);
      bitmap.cache(0, 0, stage.canvas.width, stage.canvas.height, this.main_cont.scale);

      try {
        var base64 = bitmap.getCacheDataURL();
      }
      catch {
        throw new Error('[WARN] Cette erreur vient de createjs, elle est décrite ici : https://github.com/CreateJS/EaselJS/issues/956');
      }
      var image = new createjs.Bitmap(base64);
      image.x = x;
      image.y = y+10;

      this.persistance.removeAllChildren();
      this.persistance.addChild(image);

      createjs.Tween.get(image).to({alpha: 0}, 500);
    }
    */


    this.reset = function() {

      nodes = [];
      root = null;
      current = null;
      this.panX = null;
      this.panY = null;
      this.maxLevel = 0;

      this.boxes_cont.removeAllChildren();
      this.links_cont.removeAllChildren();
      this.labels_cont.removeAllChildren();
      this.update();
    }

    this.update = function() {
      stage.update();
    }

    this.setProgressive = function(bool = true) {
      this.progressive = bool;
      return this;
    }

    this.setControlsDisplay = function(bool = true) {
      params.controls = bool;
      this.controls_cont.alpha = (bool === true)? 1 : 0;
      this.update();
      return this;
    }

    this.centerTo = function(x, y) {

      params.viewX = x;
      params.viewY = y;
      return this;
    }

    this.zoomIn = function(e) {

      this.main_cont.scale += 0.1;
      this.update();

      e.stopPropagation();
    }

    this.zoomOut = function(e) {

      this.main_cont.scale -= 0.1;
      this.update();

      e.stopPropagation();
    }
    this.setZoom = function(nb = 1) {

      this.main_cont.scale = nb;
      this.update();
    }

    this.init();

    this.resize();

    return this;
  }
})(jQuery);