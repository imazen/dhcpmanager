//This branch allows javascript population at any time.

function jsGrid(id){
    var thisGrid = this;
    this.tableId = id;
    if (document.getElementById(id) != null) this.useInnerHtml = true;
    //
    this.columnCount = 1;
    
    //tracks currently selected row DOM elements. Makes for faster deselection
    //Holes appear quickly - null values appear when items are deselected.
    this.selectedRows = new Array();
    
    addLoadEvent(function(){
        jsGrid_onLoadHandler(thisGrid)
    });
}

function jsGrid_onLoadHandler(thisGrid){
    if (thisGrid.isWritten) thisGrid.registerEvents();
    
}
jsGrid.prototype.begin = function(cssclass){
    document.write("<table id=\"" + this.tableId + "\" class=\"" + cssclass + "\" cellspacing=\"0\" cellpadding=\"0\">");
};


jsGrid.prototype.startGroup = function(key, title, isExpanded){
    // tag tr and class 'gGroup' is imperative! Used for event handlers to work
    document.write("<tr class=\"gGroup\"><td class=\"gLevel\" colspan=\"" + this.columnCount + "\">");
    
    //Header
    
    
    //expand button: class gClicker is required to attach event handlers. Make sure additional expanded/collapsed class matches table default.
    var buttonCss = "gClicker";
    if (isExpanded) buttonCss+= " expanded";
    else buttonCss +=" collapsed";
    document.write("<div class=\"groupHeader\">");
    document.write("<h1 class=\"" + buttonCss + "\">" + title + "</h1>");
    
    //Note to self: button element doesn't work with event registration.
    //classes gSelectAll and gSelectNode are required to attach event handlers
    document.write("<span class=\"gSelectAll\" >Select Group</span>" +
                    "<span class=\"gSelectNone\" >Deselect Group</span>");
    document.write("</div>");
    //tag table and class gTable is imperative. Used for event handlers
    //Add expanded or collapsed... Make sure you add CSS to
    //make expanded and collapsed work.
    
    var tableCss = "gTable";
    if (isExpanded) tableCss+= " expanded";
    else tableCss +=" collapsed";
    
    document.write("<table title=\"" + key + "\" class=\"" + tableCss + "\" cellpadding=\"0\" cellspacing=\"0\">");
//<tr class="gGroup">
//<div><span class="gClicker expanded">"</span> </div>
//<table class="gTable expanded" cellpadding="0" cellspacing="0">

    
}
jsGrid.prototype.endGroup = function(){
    document.write("</table></td></tr>");
}

jsGrid.prototype.r = function(){
    var isselected = arguments[arguments.length -1];
    var key = arguments[0];
    //parent row
    var rowCss = "canSelect";
    if (isselected == 1) rowCss += " selected";
    
    var cols = "";
    for (var i =0; i < arguments.length -1; i++){
        cols += "<td>" + arguments[i] + "</td>";
    }
    if (arguments.length - 1 > this.columnCount) this.columnCount = arguments.length -1;
    
    //title used as key for communicating selected rows.
    document.write("<tr class=\"" + rowCss + "\" title=\"" + this.encodeKeyForUpload(key) +
    "\">" + cols+ "</tr>");
   
};

jsGrid.prototype.end = function(){
   // document.write
//<input type="hidden" name="commandPath" value="" />
    document.write("</table>");
    this.fieldSelectedItemsId = this.tableId + "_selectedItems";
    document.write("<input type=\"hidden\" name=\"" + this.fieldSelectedItemsId + "\" id=\"" + this.fieldSelectedItemsId + "\" value=\"\" />");
   
    this.fieldGroupStateId = this.tableId + "_groupState";
    document.write("<input type=\"hidden\" name=\"" + this.fieldGroupStateId + "\" id=\"" + this.fieldGroupStateId + "\" value=\"\" />");
   
   
    this.isWritten = true;
    //if (!this.eventsRegistered) this.registerEvents();
    
};
jsGrid.prototype.incomplete = function(message){
    document.write("<tr class=\"incomplete\"><td colspan=\"" + this.columnCount + "\" >" + this.jsDecode(message) + "</td></tr>");  
};

jsGrid.prototype.showpaging = function(hrefPrefix, hrefSuffix, currentPage, pageCount, message){
    
    var pages = "";
    var hrefPref = this.jsDecode(hrefPrefix);
    var hrefSuff = this.jsDecode(hrefSuffix);
   
    if (pageCount > 0){
        pages +="<ol class=\"paging\">";
        for (var i = 1; i <= pageCount; i++){
            
            if (currentPage == i){
                pages += "<li class=\"currentPage\">" + i.toString() + "</li>";
            }else{
                pages += "<li><a href=\"" + hrefPref + i.toString() + hrefSuff + "\">" + i.toString() + "</a></li>";
            }
        }
        pages +="</ol>";
    }
    document.write("<tr class=\"paging\"><td colspan=\"" + this.columnCount + "\" ><div>"
     + "<p>" + this.jsDecode(message) + "</p>" + pages + "</div></td></tr>");  
};
jsGrid.prototype.encodeKeyForUpload = function(text){
    return text;
}
//Decodes paths incoming from ASP.NET
jsGrid.prototype.jsDecode = function (text){
    var str = HTMLDecode(text);
    //var newLn = new RegExp((strClassName + "\s?"), "i");
    
    return str.replace(/\\n/gi,"<br />"); //TODO: undo ASP.NET escaping
};



//<tr class="gGroup">
//<div><span class="gClicker expanded">text string</span> <span class="gSelectAll">Select All</span><span class="gSelectNone">Select None</span></div>
//<table class="gTable" cellpadding="0" cellspacing="0">

jsGrid.prototype.registerEvents = function(){
	
    this.eventsRegistered = true;
    this.elm = document.getElementById(this.tableId);
    this.rows = getElementsByClassName(this.elm,"tr","canSelect");
    
    this.fieldSelectedItems = document.getElementById(this.fieldSelectedItemsId);
    this.fieldGroupState =  document.getElementById(this.fieldGroupStateId);
    
    ///this.elm.onmousdown = function(){return false;}; //Not needed - Firefox has css to stop selection instead
    this.elm.onselectstart = function(){return false;}; //Stops selection in IE
    
    for (var i = 0; i < this.rows.length; i++){
        this.rows[i].parentGrid = this;
        this.rows[i].onmousedown = function(e){
           return this.parentGrid.rowMouseDown(this,e);
        };
        //Initialize the selectedRows array
        //ASP.NET may have requested some remain selected.
        if (hasClassName(this.rows[i],"selected")){
            this.selectedRows.push(this.rows[i]);
            //Initialized focued row to first selected item
            if (!this.lastClicked) {
                this.lastClicked = this.rows[i];
                addClassName(this.lastClicked,"focused");
            }
            
        }
        
    };
    
    //Group event handlers
    //Select All
    var selectGroupButtons = getElementsByClassName(this.elm,"*","gSelectAll");
    //Select None
    var selectNoneGroupButtons = getElementsByClassName(this.elm,"*","gSelectNone");

 	//Select all handlers   
    for(var i = 0; i < selectGroupButtons.length;i++){
        var b = selectGroupButtons[i];
        b.thisGrid = this;
        b.thisTable = this.groupFindTable(b);
        addEventSimple(b,"click",this.h_groupSelectClick);
    }
	
    //Select none handlers
    for(var i = 0; i < selectNoneGroupButtons.length;i++){
        var b = selectNoneGroupButtons[i];
        b.thisGrid = this;
        b.thisTable = this.groupFindTable(b);
        addEventSimple(b,"click",this.h_groupSelectNoneClick);
    }
    
    //Expand clickers
    var expandGroupButtons = getElementsByClassName(this.elm,"*","gClicker");
    for (var i = 0; i < expandGroupButtons.length;i++){
        var b = expandGroupButtons[i];
        b.thisGrid = this;
        b.thisTable = this.groupFindTable(b);
         addEventSimple(b,"click",this.h_groupExpandClick);
    }
    
    //Clean up event handlers, or IE memory leak will occurr!!
    if (!window.jsGridCollection){
        window.jsGridCollection = new Array();
        addEventSimple(window,"unload",jsGrid_CleanupAll);
    }
    window.jsGridCollection.push(this);
    
    
    this.storeSelection();
    this.storeGroupState();
    //Keystrokes
    //Up, Down, Shift+UP, Shift+Down
    //Ctrl+A
};
//Using h_ notation for functions that will be called from the context of a different element
//Used for assigning event handlers to various things
jsGrid.prototype.h_groupSelectNoneClick = function(){
    var t = (this.event == undefined) ? this : this.event.srcElement;

    t.thisGrid.deselectChildren(t.thisTable);
    t.thisGrid.storeSelection();
};
jsGrid.prototype.h_groupSelectClick = function(){
    var t = (this.event == undefined) ? this : this.event.srcElement;
    t.thisGrid.selectChildren(t.thisTable);
    t.thisGrid.storeSelection();
};
jsGrid.prototype.h_groupExpandClick = function(){
    var t = (this.event == undefined) ? this : this.event.srcElement;
    var isExpanded = hasClassName(t.thisTable,"expanded");
    var isCollapsed = hasClassName(t.thisTable,"collapsed");
    
        
    removeClassName(t.thisTable,"expanded");
    removeClassName(t.thisTable,"collapsed");
    removeClassName(t,"expanded");
    removeClassName(t,"collapsed");
    
    var wasExpanded = !isCollapsed;
    var nowExpanded = !wasExpanded;

    if (nowExpanded){
        addClassName(t.thisTable,"expanded");
        addClassName(t,"expanded");
        
    }else{
        addClassName(t.thisTable,"collapsed");
        addClassName(t,"collapsed");
    }
    
    t.thisGrid.storeGroupState();
    //Update 
};
jsGrid.prototype.storeGroupState = function(){
    var hf = this.fieldGroupState;
    
    
    var val = "";
    
    var gTables = getElementsByClassName(this.elm,"table","gTable");
    
    if (gTables != null){
        
        for (var i = 0; i < gTables.length; i++){
            if (hasClassName(gTables[i],"expanded"))
                val += gTables[i].title + ":1|";
            else
                val += gTables[i].title + ":0|";
        }
    }

    //alert(val);
    hf.value = val;
}
//Looks for a table classed gTable inside parent row classed gGroup
jsGrid.prototype.groupFindTable = function(siblingOrNephew){
    var findGroupRow = siblingOrNephew;
    
    while(findGroupRow != null){
        if (findGroupRow.nodeName.toLowerCase() == "tr"){
            if (hasClassName(findGroupRow,"gGroup"))
                break;
        }
        findGroupRow = findGroupRow.parentNode;
    }
    
    if (findGroupRow == null) return null;
    
    //Now find gTable
    var gTables = getElementsByClassName(findGroupRow,"table","gTable");
    if (gTables == null) return null;
    if (gTables.length == 0) return null;
    return gTables[0];
}

function jsGrid_CleanupAll(){
    for (var i = 0; i < window.jsGridCollection; i++){
        var gr = window.jsGridCollection[i];
        //cleanup each row
        for (var j = 0; j < gr.rows.length;j++){
            if (gr.rows[j]){
                gr.rows[j].onmousedown = null;
                gr.rows[j].parentGrid = null;
            }
        }
        
        //Select All
        var selectGroupButtons = getElementsByClassName(gr.elm,"*","gSelectAll");
        //Select None
        var selectNoneGroupButtons = getElementsByClassName(gr.elm,"*","gSelectNone");
        for( var i = 0; i < selectGroupButtons;i++){
            var b = selectGroupButtons[i];
            b.thisGrid = null;
            b.thisTable = null;
            removeEventSimple(b,"click",this.h_groupSelectClick);
        }
        for( var i = 0; i < selectNoneGroupButtons;i++){
            var b = selectNoneGroupButtons[i];
            b.thisGrid = null;
            b.thisTable = null;
            removeEventSimple(b,"click",this.h_groupSelectNoneClick);
        }
        
        
    }
}



//jsGrid.rows = all rows
//jsGrid.elm = tablw
//jsGrid.selectedRows = selected rows + lots of null values

jsGrid.prototype.selectChildren = function (oElm){
    
    var children = getElementsByClassName(oElm,"tr","canSelect");
    for (var i = 0; i < children.length; i++){
        this.selectRow(children[i]);
    }
}

jsGrid.prototype.deselectChildren = function (oElm){
    var children = getElementsByClassName(oElm,"tr","canSelect");
    for (var i = 0; i < children.length; i++){
        this.deselectRow(children[i]);
    }
}
jsGrid.prototype.selectAllClicked = function(){
    this.selectAll();
    this.storeSelection();
}
jsGrid.prototype.selectAll = function(){
    this.selectedRows = new Array();
    for (var i = 0; i < this.rows.length; i++){
        addClassName(this.rows[i],"selected");
        this.selectedRows.push(this.rows[i]);
    }
}
jsGrid.prototype.selectNoneClicked = function(){
    this.selectNone();
    this.storeSelection();
}
jsGrid.prototype.selectNone = function (){
    for (var i = 0; i < this.selectedRows.length; i++){
        if (this.selectedRows[i] != null)
            removeClassName(this.selectedRows[i],"selected");
    }
    this.selectedRows = new Array();
}

jsGrid.prototype.hasSelected = function(){
    for (var i = 0; i < this.selectedRows; i++){
        if (this.selectedRows[i] != null) return true;
    }
}
jsGrid.prototype.isSelected = function(elm){
    return hasClassName(elm,"canSelect") && hasClassName(elm,"selected");
};
function logit(name,th,args){
    var str = th + "." + name + " (";
    for (var i = 0; i < args.length; i++){
        if (i > 0) str += ", ";
        str += args[i];
    }
    console.log(str + ");");
}
jsGrid.prototype.rowMouseDown = function(rowElm,e){
    if (!e) e= window.event;
    //logit("rowMouseDown",this,arguments);
    

    //e.shiftKey
    //e.ctrlKey
    if (e.shiftKey){
        if (this.lastClicked){
            
            this.selectRowRange(this.lastClicked,rowElm);
        }else{
            this.selectNone();
            this.selectRow(rowElm);
        }
    }else if (e.ctrlKey){
        this.toggleRow(rowElm);
    }else{
        this.selectNone();
        this.selectRow(rowElm);
    }
    //store in hidden field
    this.storeSelection();

    //focused outline
    if (this.lastClicked) removeClassName(this.lastClicked,"focused");
    this.lastClicked = rowElm;
    addClassName(this.lastClicked,"focused");
    if (this.onItemFocus) this.onItemFocus();
};


jsGrid.prototype.onItemFocus = function(){
    var row = this.lastClicked;
    if (!row) return;
    
    var pathElms = getElementsByClassName(row,"span","path");
    if (pathElms.length ==  0) return;
    
    var htmlEncodedPath = pathElms[0].innerHTML;
    //URL Encode
    var URLEncodedPath =htmlEncodedPath;
    
    var path = htmlEncodedPath;
    
    if (this.focusedLinkDictionary){
        for (aId in this.focusedLinkDictionary) {
            var prefix = this.focusedLinkDictionary[aId];
            var oElm = document.getElementById(aId);
            if (prefix.length > 0)
                oElm.href = prefix + URLEncodedPath;
            else
                oElm.href = path;
        }
    }
}

jsGrid.prototype.registerFocusedLink = function(anchorID,urlprefix){
    if (!this.focusedLinkDictionary) this.focusedLinkDictionary = { };
    this.focusedLinkDictionary[anchorID] =this.jsDecode( urlprefix);
}


jsGrid.prototype.selectRow = function (rowElm){
    if (!hasClassName(rowElm,"selected")){
        this.selectedRows.push(rowElm);
        addClassName(rowElm,"selected");
    }
};

jsGrid.prototype.toggleRow = function (rowElm){
    if (hasClassName(rowElm,"selected")){
        this.deselectRow(rowElm);
    }else{
        this.selectRow(rowElm);
    }
    
};
jsGrid.prototype.deselectRow = function(rowElm){
        removeClassName(rowElm,"selected");
        for (var i = 0; i < this.selectedRows.length;i++){
            if (this.selectedRows[i] != null)
                if (this.selectedRows[i] == rowElm)
                    this.selectedRows[i] = null;
        }    
}
jsGrid.prototype.selectRowRange = function (row1,row2){
    
    //Used to determine correct ordering. Both are null until the first row of row1 or row2 is found, then
    //row1 and row2 are assigned to each of them, depending upon the order.
    var firstFound = null;
    var lastRow = null;
    for (var i = 0; i < this.rows.length; i++){
    
        
        if (!firstFound){
            //We haven't seend row1 or row2 yet
            if (this.rows[i] == row1){
                firstFound = row1;
                lastRow = row2;
            } else if (this.rows[i] == row2){
                firstFound =row2;
                lastRow=row1;
            }
            
        }
        
        if (firstFound){
            //We have hit row1 or row2 already, and lastRow = row1 or lastRow = row2
            //lastRow hasn't been hit yet - we should stop selecting rows when we find it.
            this.selectRow(this.rows[i]);
            
            if (this.rows[i] == lastRow){
                firstFound = null;
                lastRow = null;
                break;
            }
        }
    }
    
};
jsGrid.prototype.storeSelection = function(){
    var hf = this.fieldSelectedItems;
    
    
    var val = "";
    var selCount = 0;
    for (var i = 0; i < this.selectedRows.length; i++){
        if (this.selectedRows[i] != null){
            if (val.length > 0) val += "|";
            selCount++;
            val += this.selectedRows[i].title;
        }
    }
    this.selectedCount = selCount;

    //alert(val);
    hf.value = val;
    
    
    if (this.afterSelectionChanged) this.afterSelectionChanged();
}


jsGrid.prototype.registerSelectionChangedHandler = function(func){
    if (this.afterSelectionChanged){
        throw "Only one event handler allowed";
    }else{
        this.afterSelectionChanged = func;
    }
}
//function GetId(path){
//    var newStr = "";
//    for (int i = 0; i < path.length; i++){
//        int ch = path.charCode(i);
//        if ((ch >= 48 && ch <= 57) || (ch >=  65 && ch <= 90) || (ch >= 97 && ch <= 122)){
//            newStr += String.fromCharCode(ch);
//        }else{
//            newStr += "_" + ch + "_";
//        }
//    }
//    
//    return newStr;
//}
function disableChildren(oElmId){
    var oElm = document.getElementById(oElmId);
     if (oElm == null) return;
    var arrElements = oElm.getElementsByTagName("input");
    for (var i = 0; i <arrElements.length; i++){
        arrElements[i].disabled=true;
    }
}
function enableChildren (oElmId){
    var oElm = document.getElementById(oElmId);
    if (oElm == null) return;
    var arrElements = oElm.getElementsByTagName("input");
    for (var i = 0; i <arrElements.length; i++){
        arrElements[i].disabled=false;
    }
}
function hasClassName(oElm, strClassName){
	var strCurrentClass = oElm.className;
	return (new RegExp(strClassName, "i").test(strCurrentClass));
}

function addEventSimple(obj,evt,fn) {
	if (obj.addEventListener)
		obj.addEventListener(evt,fn,false);
	else if (obj.attachEvent)
		obj.attachEvent('on'+evt,fn);
}

function removeEventSimple(obj,evt,fn) {
	if (obj.removeEventListener)
		obj.removeEventListener(evt,fn,false);
	else if (obj.detachEvent)
		obj.detachEvent('on'+evt,fn);
}


/*
	Copyright Robert Nyman, http://www.robertnyman.com
	Free to use if this text is included
	http://www.robertnyman.com/js/ej.js
	Modified by Nathanael Jones
*/
// ---
/*function $(strId){
	return document.getElementById(strId);
}*/
// ---
function getElementsByClassName(oElm, strTagName, strClassName){
	var arrElements = (strTagName == "*" && oElm.all)? oElm.all : oElm.getElementsByTagName(strTagName);
	var arrReturnElements = new Array();
	strClassName = strClassName.replace(/\-/g, "\\-");
	var oRegExp = new RegExp("(^|\\s)" + strClassName + "(\\s|$)");
	var oElement;
	for(var i=0; i<arrElements.length; i++){
		oElement = arrElements[i];		
		if(oRegExp.test(oElement.className)){
			arrReturnElements.push(oElement);
		}	
	}
	return (arrReturnElements)
}

//MAKE SURE NO CSS CLASSES ARE SUBSTRINGS OF ONE ANOTHER!!!!!

// ---
function addClassName(oElm, strClassName){
	var strCurrentClass = oElm.className;
	if(!new RegExp(strClassName, "i").test(strCurrentClass)){
	    
		oElm.className = strCurrentClass + ((strCurrentClass.length > 0)? " " : "") + strClassName;
	}
}
// ---
function removeClassName(oElm, strClassName){
	var oClassToRemove = new RegExp((strClassName + "\s?"), "i");
	if(oClassToRemove.test(oElm.className)){   
	    oElm.className = oElm.className.replace(oClassToRemove, "").replace(/^\s?|\s?$/g, "");
	}
}
// ---