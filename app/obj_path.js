
//  -----------------------------------
//  PATH OBJECT
//  -----------------------------------

	function Path(oa){
		this.objtype = "path";

		//debug("NEW PATH: oa = \n" + JSON.stringify(oa));

		// declare attributes
		this.pathpoints = false;
		if(oa.pathpoints && oa.pathpoints.length){
			this.pathpoints = [];
			//debug("NEW PATH : Hydrating Path Points, length " + oa.pathpoints.length);
			for (var i = 0; i < oa.pathpoints.length; i++) {
				this.pathpoints[i] = new PathPoint(oa.pathpoints[i]);
			}
		}
		this.clockwise = isval(oa.clockwise)? oa.clockwise : findClockwise(this.pathpoints);
		// internal
		this.topy = isval(oa.topy)? oa.topy : -1;
		this.bottomy = isval(oa.bottomy)? oa.bottomy : -1;
		this.leftx = isval(oa.leftx)? oa.leftx : -1;
		this.rightx = isval(oa.rightx)? oa.rightx : -1;

		// Setup the object
		this.selectPathPoint(false);
		if(this.pathpoints) this.calcMaxes();

		//debug("Path() - created new path: " + this.pathpoints);
	}




//  -----------------------------------
//  PATH METHODS
//  -----------------------------------


	// Selected Point - returns the selected point object
	Path.prototype.sp = function(wantindex, calledby){
		//debug("SP - Called By : " + calledby);

		if(!this.pathpoints) {
			//debug("SP - returning false, this.pathpoints = " + JSON.stringify(this.pathpoints));
			return false;
		}

		for(var p=0; p<this.pathpoints.length; p++){
			var thisp = this.pathpoints[p];
			if(thisp.selected){
				if(wantindex){
					return p;
				} else {
					return thisp;
				}
			}
		}

		return false;
	};

	Path.prototype.drawPath = function(lctx) {
		//if(lctx == _UI.chareditctx)	debug("DRAWPATH");

		if(this.pathpoints === false || this.pathpoints.length < 2) return;
		var pp, np, pph2x, pph2y, nxh1x, nxh1y, nxppx, nxppy;

		lctx.moveTo(sx_cx(this.pathpoints[0].P.x), sy_cy(this.pathpoints[0].P.y));

		for(var cp = 0; cp < this.pathpoints.length; cp++){
			pp = this.pathpoints[cp];
			np = this.pathpoints[(cp+1) % this.pathpoints.length];

			/*
			if(lctx == _UI.chareditctx)	{
				debug("  point " + cp);
				debug("\n  pp\n" + JSON.stringify(pp));
				debug("  np\n" + JSON.stringify(np));
			}
			*/

			if(pp.type == "symmetric") { pp.makeSymmetric("H1"); }
			else if (pp.type == "flat") { pp.makeFlat("H1"); }

			pph2x = (pp.useh2? sx_cx(pp.H2.x) : sx_cx(pp.P.x));
			pph2y = (pp.useh2? sy_cy(pp.H2.y) : sy_cy(pp.P.y));
			nxh1x = (np.useh1? sx_cx(np.H1.x) : sx_cx(np.P.x));
			nxh1y = (np.useh1? sy_cy(np.H1.y) : sy_cy(np.P.y));
			nxppx = sx_cx(np.P.x);
			nxppy = sy_cy(np.P.y);

			//if(lctx == _UI.chareditctx)	debug("  curve " + pph2x +" "+ pph2y +" "+ nxh1x +" "+ nxh1y +" "+ nxppx +" "+ nxppy);
			lctx.bezierCurveTo(pph2x, pph2y, nxh1x, nxh1y, nxppx, nxppy);
		}
	};

	Path.prototype.drawPathToArea = function(lctx, view){
		var tempv = clone(getView("Path.drawPathToArea"));
		setView(view);
		this.drawPath(lctx);

		setView(tempv);
	};

	Path.prototype.genPathPostScript = function(lastx, lasty){
		if(!this.pathpoints) return {"re":"", "lastx":lastx, "lasty":lasty};

		var p1, p2, p1h2x, p1h2y, p2h1x, p2h1y, p2ppx, p2ppy;
		var trr = "";

		var re = "" + (this.pathpoints[0].P.x - lastx) + " " + (this.pathpoints[0].P.y - lasty) + " rmoveto ";

		//debug("GENPATHPOSTSCRIPT:\n\t " + re);

		for(var cp = 0; cp < this.pathpoints.length; cp++){
			p1 = this.pathpoints[cp];
			p2 = this.pathpoints[(cp+1) % this.pathpoints.length];

			p1h2x = p1.useh2? (p1.H2.x - p1.P.x) : 0;
			p1h2y = p1.useh2? (p1.H2.y - p1.P.y) : 0;
			p2h1x = p2.useh1? (p2.H1.x - (p1.useh2? p1.H2.x : p1.P.x)) : (p2.P.x - (p1.useh2? p1.H2.x : p1.P.x));
			p2h1y = p2.useh1? (p2.H1.y - (p1.useh2? p1.H2.y : p1.P.y)) : (p2.P.y - (p1.useh2? p1.H2.y : p1.P.y));
			p2ppx = (p2.P.x - (p2.useh1? p2.H1.x : p2.P.x));
			p2ppy = (p2.P.y - (p2.useh1? p2.H1.y : p2.P.y));

			trr = "\t\t\t\t" + p1h2x + " " + p1h2y + " " + p2h1x + " " + p2h1y + " " + p2ppx + " " + p2ppy + " rrcurveto \n";

			//debug("\t " + trr);

			re += trr;
		}

		return {
			"re" : re,
			"lastx" : p2.P.x,
			"lasty" : p2.P.y
			};
	};

	Path.prototype.isOverControlPoint = function(x, y){
		var a = this.pathpoints;
		var hp = _GP.projectsettings.pointsize/getView("Path.isOverControlPoint").dz;

		for(var k=a.length-1; k>=0; k--){
			if( ((a[k].P.x+hp) > x) && ((a[k].P.x-hp) < x) && ((a[k].P.y+hp) > y) && ((a[k].P.y-hp) < y) ){
				this.selectPathPoint(k);
				//debug("ISOVERCONTROLPOINT() - Returning P1, selectedpoint: " + k);
				return 'P';
			}

			if( ((a[k].H1.x+hp) > x) && ((a[k].H1.x-hp) < x) && ((a[k].H1.y+hp) > y) && ((a[k].H1.y-hp) < y) ){
				this.selectPathPoint(k);
				//debug("ISOVERCONTROLPOINT() - Returning H1, selectedpoint: " + k);
				return 'H1';
			}

			if( ((a[k].H2.x+hp) > x) && ((a[k].H2.x-hp) < x) && ((a[k].H2.y+hp) > y) && ((a[k].H2.y-hp) < y) ){
				this.selectPathPoint(k);
				//debug("ISOVERCONTROLPOINT() - Returning H2, selectedpoint: " + k);
				return 'H2';
			}
		}

		this.selectPathPoint(0);
		//debug("ISOVERCONTROLPOINT() - Returning FALSE");
		return false;
	};

	Path.prototype.updatePathSize = function(dw, dh){
		//debug("UPDATEPATHSIZE - Change Size: dw/dh "+dw+" , "+dh);

		var ps = _GP.projectsettings;

		var s = ss("updatePathPosition");
		dw = s.wlock? 0 : false;
		dh = s.hlock? 0 : false;

		if(s.wlock && s.hlock) return;

		var oldw = this.rightx - this.leftx;
		var oldh = this.topy - this.bottomy;
		var neww = Math.max((oldw + dw), 1);
		var newh = Math.max((oldh + dh), 1);
		var ratiodh = (newh/oldh);
		var ratiodw = (neww/oldw);

		for(var e=0; e<this.pathpoints.length; e++){
			var pp = this.pathpoints[e];
			pp.P.x =   round( ((pp.P.x  - this.leftx) * ratiodw) + this.leftx  );
			pp.H1.x =  round( ((pp.H1.x - this.leftx) * ratiodw) + this.leftx  );
			pp.H2.x =  round( ((pp.H2.x - this.leftx) * ratiodw) + this.leftx  );
			pp.P.y =   round( ((pp.P.y  - this.bottomy) * ratiodh) + this.bottomy  );
			pp.H1.y =  round( ((pp.H1.y - this.bottomy) * ratiodh) + this.bottomy  );
			pp.H2.y =  round( ((pp.H2.y - this.bottomy) * ratiodh) + this.bottomy  );
		}

		this.calcMaxes();
	};

	Path.prototype.updatePathPosition = function(dx, dy, force){
		force = isval(force)? force : false;
		//debug("UPDATEPATHPOSITION - dx,dy,force "+dx+","+dy+","+force+" - pathpoints length: " + this.pathpoints.length);

		for(var d=0; d<this.pathpoints.length; d++){
			var pp = this.pathpoints[d];
			//debug("-------------------- pathPoint #" + d);
			pp.updatePointPosition("P",dx,dy,force);
		}

		this.calcMaxes();
	};

	function findClockwise(parr){
		var j,k,z;
		var count = 0;

		if (parr.length < 3) return 0;

		for (var i=0; i<parr.length; i++) {
			j = (i + 1) % parr.length;
			k = (i + 2) % parr.length;
			z  = (parr[j].P.x - parr[i].P.x) * (parr[k].P.y - parr[j].P.y);
			z -= (parr[j].P.y - parr[i].P.y) * (parr[k].P.x - parr[j].P.x);

			if (z < 0) count--;
			else if (z > 0) count++;
		}

		// negative = clockwise
		// positive = counterclockwise

		//debug("FINDCLOCKWISE returning " + count);
		return count;
	}

	Path.prototype.reversePath = function(){
		var HT = {};
		if(this.pathpoints){
			for (var i = 0; i < this.pathpoints.length; i++) {
				HT = this.pathpoints[i].H1;
				this.pathpoints[i].H1 = this.pathpoints[i].H2;
				this.pathpoints[i].H2 = HT;
				if(this.pathpoints[i].useh1 !== this.pathpoints[i].useh2){
					this.pathpoints[i].useh1 = !this.pathpoints[i].useh1;
					this.pathpoints[i].useh2 = !this.pathpoints[i].useh2;
				}
			}
			this.pathpoints.reverse();
			this.clockwise *= -1;
		}
	};

	Path.prototype.flipNS = function(){
		var ly = this.topy;
		var lx = this.leftx;

		var mid = ((this.topy - this.bottomy)/2)+this.bottomy;
		//debug("FLIPNS - calculating mid: (b-t)/2 + t = mid: " + this.bottomy +","+ this.topy + ","+ mid);

		for(var e=0; e<this.pathpoints.length; e++){
			var pp = this.pathpoints[e];
			pp.P.y += ((mid-pp.P.y)*2);
			pp.H1.y += ((mid-pp.H1.y)*2);
			pp.H2.y += ((mid-pp.H2.y)*2);
		}

		this.setTopY(ly);
		this.setLeftX(lx);

		this.reversePath();
	};

	Path.prototype.flipEW = function(){
		var ly = this.topy;
		var lx = this.leftx;

		var mid = ((this.rightx - this.leftx)/2)+this.leftx;
		//debug("flipEW - calculating mid: (b-t)/2 + t = mid: " + this.rightx +","+ this.leftx +","+ mid);

		for(var e=0; e<this.pathpoints.length; e++){
			var pp = this.pathpoints[e];
			pp.P.x += ((mid-pp.P.x)*2);
			pp.H1.x += ((mid-pp.H1.x)*2);
			pp.H2.x += ((mid-pp.H2.x)*2);
		}

		this.setTopY(ly);
		this.setLeftX(lx);

		this.reversePath();
	};

	Path.prototype.setTopY = function(newvalue){
		var delta = ((newvalue*1) - ss("setTopY").path.topy);
		this.updatePathPosition(0,delta,true);
	};

	Path.prototype.setLeftX = function(newvalue){
		var delta = ((newvalue*1) - ss("SetLeftX").path.leftx);
		this.updatePathPosition(delta,0,true);
	};

	Path.prototype.addPathPoint = function(newpp, addtostart){
		//debug("ADDPATHPOINT - new point? " + newpp);

		if(!newpp) {
			// No pathpoint passed to function - make a new one
			newpp = new PathPoint({});

			if(addtostart){
				//Adds new pathpoint to start of path
				if(this.pathpoints.length > 0){
					var firstpp = this.pathpoints[0];

					newpp.P.x = firstpp.P.x-200;
					newpp.P.y = firstpp.P.y-200;
					newpp.H1.x = newpp.P.x;
					newpp.H1.y = newpp.P.y-100;
					newpp.H2.x = newpp.P.x+100;
					newpp.H2.y = newpp.P.y;
				}

				this.pathpoints.unshift(newpp);
				this.selectPathPoint(0);
			} else {
				// Adds new pathpoint to end of path
				if(this.pathpoints.length > 0){
					var lastpp = this.pathpoints[this.pathpoints.length-1];

					newpp.P.x = lastpp.P.x+200;
					newpp.P.y = lastpp.P.y+200;
					newpp.H1.x = newpp.P.x;
					newpp.H1.y = newpp.P.y-100;
					newpp.H2.x = newpp.P.x+100;
					newpp.H2.y = newpp.P.y;
				}

				this.pathpoints.push(newpp);
				this.selectPathPoint(this.pathpoints.length-1);
			}
		} else {
			// Function was passed a new path point
			this.pathpoints.push(newpp);
			this.selectPathPoint(this.pathpoints.length-1);
		}

		this.calcMaxes();
	};

	Path.prototype.insertPathPoint = function() {

		var p1i = this.sp(true, "insert path point");
		var p1 = (p1i === false ? this.pathpoints[0] : this.pathpoints[p1i]);

		if(this.pathpoints.length > 1){
			var p2 = this.pathpoints[(p1i+1)%this.pathpoints.length];

			var newPx = (p1.P.x*0.125) + (p1.H2.x*0.375) + (p2.H1.x*0.375) + (p2.P.x*0.125);
			var newPy = (p1.P.y*0.125) + (p1.H2.y*0.375) + (p2.H1.y*0.375) + (p2.P.y*0.125);

			var newpp = new PathPoint({"P":new Coord({"x":newPx, "y":newPy}), "type":"flat"});
			// Handles (tangents)

			var newH2x = ((p2.H1.x - p2.P.x) / 2) + p2.P.x;
			var newH2y = ((p2.P.y - p2.H1.y) / 2) + p2.H1.y;

			//debug("INSERTPATHPOINT - before makepointedto " + JSON.stringify(newpp));

			newpp.makePointedTo(newH2x, newH2y, 100);
			var tempH2 = newpp.H2;
			newpp.H2 = newpp.H1;
			newpp.H1 = tempH2;
			newpp.makeSymmetric("H2");

			//debug("INSERTPATHPOINT - afters makepointedto " + JSON.stringify(newpp));


			this.pathpoints.splice((p1i+1)%this.pathpoints.length, 0, newpp);
			this.selectPathPoint((p1i+1)%this.pathpoints.length);

		}

		this.calcMaxes();
	};

	Path.prototype.deletePathPoint = function(){
		var pp = this.pathpoints;

		if(pp.length > 1){
			for(var j=0; j<pp.length; j++){
				if(pp[j].selected){
					pp.splice(j, 1);
					if(j>0) {
						pp[j-1].selected = true;
					} else {
						pp[0].selected = true;
					}
				}
			}
			this.calcMaxes();
		} else {
			_UI.selectedtool = "pathedit";
			deleteShape();
		}
	};

	Path.prototype.selectPathPoint = function(index){
		// FOR NOW, ONLY ONE POINT SELECTED
		//debug("SELECTPATHPOINT - passed " + index + " length " + this.pathpoints.length + " mod " +(index%this.pathpoints.length));
		for(var j=0; j<this.pathpoints.length; j++){
			this.pathpoints[j].selected = false;
		}

		if(index === false){
			return;
		} else {
			index = (index == -1)? (this.pathpoints.length-1) : Math.abs(index);
			this.pathpoints[index%this.pathpoints.length].selected = true;
			//debug("SELECTPATHPOINT - selecting point " + index%this.pathpoints.length));
		}
	};

//	----------------------------------
//	Calc Maxes Stuff
//	----------------------------------

	Path.prototype.calcMaxes = function(){
		//console.time("CalcMaxes_NEW");

		this.topy = (_UI.chareditcanvassize*-1);
		this.bottomy = _UI.chareditcanvassize;
		this.leftx = _UI.chareditcanvassize;
		this.rightx = (_UI.chareditcanvassize*-1);

		var pp1, pp2, pp1h2x, pp1h2y, pp2h1x, pp2h1y, tbounds;

		for(var s=0; s<this.pathpoints.length; s++){
			pp1 = this.pathpoints[s];
			pp2 = this.pathpoints[(s+1)%this.pathpoints.length];
			pp1h2x = (pp1.useh2? pp1.H2.x : pp1.P.x);
			pp1h2y = (pp1.useh2? pp1.H2.y : pp1.P.y);
			pp2h1x = (pp2.useh1? pp2.H1.x : pp2.P.x);
			pp2h1y = (pp2.useh1? pp2.H1.y : pp2.P.y);

			tbounds = getBounds(pp1.P.x, pp1.P.y, pp1h2x, pp1h2y, pp2h1x, pp2h1y, pp2.P.x, pp2.P.y);

			this.rightx = Math.max(this.rightx, tbounds.maxx);
			this.topy = Math.max(this.topy, tbounds.maxy);
			this.leftx = Math.min(this.leftx, tbounds.minx);
			this.bottomy = Math.min(this.bottomy, tbounds.miny);
		}

		updateCurrentCharWidth();
		//console.timeEnd("CalcMaxes_NEW");
	};

	function getBounds(x1, y1, cx1, cy1, cx2, cy2, x2, y2){
		var bounds = {
			"minx" : Math.min(x1,x2),
			"miny" : Math.min(y1,y2),
			"maxx" : Math.max(x1,x2),
			"maxy" : Math.max(y1,y2)
		};

		var dcx0 = cx1 - x1;
		var dcy0 = cy1 - y1;
		var dcx1 = cx2 - cx1;
		var dcy1 = cy2 - cy1;
		var dcx2 = x2 - cx2;
		var dcy2 = y2 - cy2;

		var numerator, denominator, quadroot, root, t1, t2;

		if(cx1<bounds["minx"] || cx1>bounds["maxx"] || cx2<bounds["minx"] || cx2>bounds["maxx"]) {
			// X bounds
			if(dcx0+dcx2 != 2*dcx1) { dcx1+=0.01; }
			numerator = 2*(dcx0 - dcx1);
			denominator = 2*(dcx0 - 2*dcx1 + dcx2);
			quadroot = (2*dcx1-2*dcx0)*(2*dcx1-2*dcx0) - 2*dcx0*denominator;
			root = Math.sqrt(quadroot);
			t1 =  (numerator + root) / denominator;
			t2 =  (numerator - root) / denominator;
			if(0<t1 && t1<1) { checkXbounds(bounds, getBezierValue(t1, x1, cx1, cx2, x2)); }
			if(0<t2 && t2<1) { checkXbounds(bounds, getBezierValue(t2, x1, cx1, cx2, x2)); }
		}

		// Y bounds
		if(cy1<bounds["miny"] || cy1>bounds["maxy"] || cy2<bounds["miny"] || cy2>bounds["maxy"]) {
			if(dcy0+dcy2 != 2*dcy1) { dcy1+=0.01; }
			numerator = 2*(dcy0 - dcy1);
			denominator = 2*(dcy0 - 2*dcy1 + dcy2);
			quadroot = (2*dcy1-2*dcy0)*(2*dcy1-2*dcy0) - 2*dcy0*denominator;
			root = Math.sqrt(quadroot);
			t1 =  (numerator + root) / denominator;
			t2 =  (numerator - root) / denominator;
			if(0<t1 && t1<1) { checkYbounds(bounds, getBezierValue(t1, y1, cy1, cy2, y2)); }
			if(0<t2 && t2<1) { checkYbounds(bounds, getBezierValue(t2, y1, cy1, cy2, y2)); }
		}

		return bounds;
	}

	function checkXbounds(bounds, value) {
		if(bounds["minx"] > value) { bounds["minx"] = value; }
		else if(bounds["maxx"] < value) { bounds["maxx"] = value; }
	}

	function checkYbounds(bounds, value) {
		if(bounds["miny"] > value) { bounds["miny"] = value; }
		else if(bounds["maxy"] < value) { bounds["maxy"] = value; }
	}

	function getBezierValue(t, p0, p1, p2, p3) {
		var mt = (1-t);
		return (mt*mt*mt*p0) + (3*mt*mt*t*p1) + (3*mt*t*t*p2) + (t*t*t*p3);
	}
