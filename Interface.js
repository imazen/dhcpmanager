
var primaryAddress = "192.168.100.71";
var secondaryAddresses = ["192.168.100.66"];
var scopeId = "192.168.0.0";
var ranges = 
	[
	new IPRange("192.168.60.2","192.168.60.255", "Full HTTP Access"),
	new IPRange("192.168.70.2","192.168.70.255", "Full access (All protocols)"),
	new IPRange("192.168.100.2","192.168.100.255", "Servers and Routers"),
	new IPRange("192.168.50.2","192.168.52.255", "Default Range (Limited Web Access)"),
	new IPRange("192.168.49.2","192.168.49.255", "Printers")
	];

//IPRange definition
function IPRange(first,last,title){ this.first = first; this.last = last; this.title = title;}

var unassignedClientArray = null;
var reservationArray = null;
var currentItem = null;
var scopeAll = null; //The selected scope on all servers
var scopePrimary = null; //The selected scope on the current server.

function byId(id){return document.getElementById(id);}

function populateRanges(){
	var rlist = byId("sRanges");
	rlist.length = 0;
	for(var i = 0; i < ranges.length; i++){
		rlist.options[i] = new Option(ranges[i].title + " " + ranges[i].first + " -  " + ranges[i].last);
	}
}

function setupTabs(){
	byId("tbUnassigned").onclick = function(){
		byId("tbUnassigned").className = "selected";
		byId("tbReservations").className = "";
		byId("tUnassigned").style.display = "block";
		byId("tReservations").style.display = "none";
	}
	
	byId("tbReservations").onclick = function(){
		byId("tbUnassigned").className = "";
		byId("tbReservations").className = "selected";
		byId("tUnassigned").style.display = "none";
		byId("tReservations").style.display = "block";
	}
	byId("tbUnassigned").onclick();//default to first tab
}

//returns 1 or 2
function currentTab(){
	if (byId("tUnassigned").style.display == "block") return 1;
	else return 2;
}

var formatIp = function(elCell, oRecord, oColumn, oData){
	elCell.innerHTML = new IPAddress(oData).toString();
}
var formatMac = function(elCell, oRecord, oColumn, oData){
	elCell.innerHTML = new MACAddress(oData).toSegmentedString();
}
var parseIp = function(oData){
	return new IPAddress(oData).integerValue;
}
var parseMac = function(macstr){
	return new MACAddress(macstr).integerValue;
}

var uDataTable =null;
function updateUList(){
	var myDataSource = new YAHOO.util.DataSource(unassignedClientArray);
	myDataSource.responseType = YAHOO.util.DataSource.TYPE_JSARRAY;
	myDataSource.responseSchema = {
	    fields: [
		{key: "dnsname"},{key:"ipAddress", parser:parseIp}
		,{key:"mac", parser:parseMac}]
	};
	

	var myColumnDefs = [{key: "dnsname", label:"Name",sortable:true}, 
						{key: "ipAddress", label:"IP Address", sortable:true, formatter:formatIp,  resizeable:true}, 
						{key: "mac", label:"MAC Address", sortable:true, formatter:formatMac,resizeable:true}]; 
	uDataTable = new YAHOO.widget.DataTable("ulistHolder", myColumnDefs, myDataSource,
			 {scrollable:true}); 
	uDataTable.set("selectionMode","single");
	uDataTable.subscribe("rowClickEvent", uDataTable.onEventSelectRow);
	uDataTable.subscribe("rowSelectEvent", function(){
		l(uDataTable.getLastSelectedRecord());
		var record = uDataTable.getRecordSet().getRecord(uDataTable.getLastSelectedRecord());
		displayUnassigned(record._oData);
	});

}
var rDataTable = null;
function updateRList(){
	var myDataSource = new YAHOO.util.DataSource(reservationArray);
	myDataSource.responseType = YAHOO.util.DataSource.TYPE_JSARRAY;
	myDataSource.responseSchema = {
		fields: [{
			key: "name"}, {
			key: "ipAddress",
			parser: parseIp}, {
			key: "mac",
			parser: parseMac}, {
			key: "description"}]
	};
	
	
	var formatRName = function(elCell, oRecord, oColumn, oData){
		var hash = new IPAddress(oRecord.getData("ipAddress")).toHashString();
		if (activeReservations[hash] == true){
			//active
			elCell.innerHTML = "<span class=\"active\">&nbsp;</span>" + oData;
		}else{
			//not
			elCell.innerHTML = "<span class=\"inactive\">&nbsp;</span>" + oData;
		}
	};
	
	var myColumnDefs = [{
		key: "name",
		label: "Name",
		sortable: true,
		formatter: formatRName
	}, {
		key: "ipAddress",
		label: "IP Address",
		sortable: true,
		formatter: formatIp,
		resizeable: true,
		width:"10em"
	}, {
		key: "mac",
		label: "MAC Address",
		sortable: true,
		formatter: formatMac,
		resizeable: true,
		width:"11em"
	}, {
		key: "description",
		label: "Description",
		sortable: true,
		resizeable: true
		
	}];
	
	rDataTable = new YAHOO.widget.DataTable("rlistHolder", myColumnDefs, myDataSource, {
		scrollable: true
	});
	
	rDataTable.set("selectionMode", "single");
	rDataTable.subscribe("rowClickEvent", rDataTable.onEventSelectRow);
	rDataTable.subscribe("rowSelectEvent", function(){
		l(rDataTable.getLastSelectedRecord());
		var record = rDataTable.getRecordSet().getRecord(rDataTable.getLastSelectedRecord());
		displayReservation(record._oData);
	});
	
}
function prn(obj){
	for (var n in obj){
		l(obj + "." + n + "=" + obj[n]);
	}

}
function displayUnassigned(dc){
	prn(dc);
	currentItem = dc;
	byId("txtIPAddress").value = new IPAddress(dc.ipAddress).toString();
	byId("txtMACAddress").value = new MACAddress(dc.mac).toString();
	byId("txtClient").value = dc.dnsname;
	byId("txtDescription").value = "";
	byId("btnsReservations").style.display = "none";
}
function displayReservation(dr){
	prn(dr);
	currentItem = dr;
	byId("txtIPAddress").value =  new IPAddress(dr.ipAddress).toString();
	byId("txtMACAddress").value =new MACAddress(dr.mac).toString();
	byId("txtClient").value = dr.name;
	byId("txtDescription").value = dr.description;
	byId("btnsReservations").style.display = "block";
}

function populateInterface(){

    var primary = new DhcpServer(primaryAddress);
	
	
	var availableServers = [];
	
	//Populate availableServers array and warn user.
    if (!primary.checkServer()) {
        alert("Failed to connect to primary server " + primaryAddress + "\n" + primary.execute("show scopes"));
    }else{
		availableServers.push(primaryAddress)
	}
	for(var i =0; i < secondaryAddresses.length; i++){
		var addr = secondaryAddresses[i];
		var s = new DhcpServer(addr);
		if (!s.checkServer()){
			alert("Failed to connect to secondary server " + addr + "\n" + s.execute("show scopes"));
		}else availableServers.push(addr);
	}
	
	
	scopeAll = new DhcpServerGroupSharedScope(
		availableServers,
		scopeId);
		
	scopePrimary = primary.scope(scopeId);
	
	byId("sPrimary").innerText = primaryAddress;
	var slist = byId("sSecondary");
	slist.length = 0;
	for(var i = 0; i < availableServers.length; i++){
		if (availableServers[i] != primaryAddress)
			slist.options[i] = new Option(availableServers[i]);
	}
	slist.selectedIndex = 1;
	
    updateData();
    setupTabs();
    
}
var activeReservations = null;
function updateData(){
	
	//Get both active reservation array (on all) and client leases (on all);
	var leaseData = scopeAll.getNonReservedClientsAndActiveArray();
	
	//Active reservations on all.
	activeReservations = leaseData.activeReservations;
	
	//leases on all
	unassignedClientArray = leaseData.leases;
	updateUList();
	
	//Get reservations from primary server.
	reservationArray = scopePrimary.getReservations();
	updateRList()
}
var differences = null;
function window_onload(){
	populateInterface();
	populateRanges();
	
	byId("btnGetNext").onclick = function(){
		var rlist = byId("sRanges");
		var range = ranges[rlist.selectedIndex];
		
		
		var ipa = scopePrimary.firstUnusedInRange(range.first, range.last);

		
		if (ipa != null) {
			byId("txtIPAddress").value = ipa;
		}
		else {
			alert("Failed to find an available IP address in that range.")
		}
	
	}
	byId("btnRefresh").onclick = function(){
		updateData();
	}
	byId("btnCompare").onclick = function(){
		var slist = byId("sSecondary");
		var ip = slist.options[slist.selectedIndex].text;
		selectedScope = new DhcpServer(ip).scope(scopeId);
		differences = scopePrimary.compareReservations(selectedScope);
		
		if (differences.length > 0) {
		
			var text = "";
			for (var i = 0; i < differences.length; i++) {
				var msg = "";
				var a = differences[i].a;
				var b = differences[i].b;
				if (b != null || a != null) {
				
					if (a == null && b != null) {
						msg = "Deleting " + (new IPAddress(b.ipAddress).toString()) + " " +
						(new MACAddress(b.mac).toSegmentedString()) +
						" " +
						b.name +
						" \"" +
						b.description +
						"\" \"" +
						b.type +
						"\""
					}
					else {
						if (b == null && a != null) {
							msg = "Adding " + (new IPAddress(a.ipAddress).toString()) + " " +
							(new MACAddress(a.mac).toSegmentedString()) +
							" " +
							a.name +
							" \"" +
							a.description +
							"\" \"" +
							a.type +
							"\"";
							
						}
						else {
						
						
						
						
						
						
							var changes = [];
							if (new IPAddress(a.ipAddress).integerValue !=
							new IPAddress(b.ipAddress).integerValue) 
								changes.push(b.ipAddress + " to " + a.ipAddress);
							
							if (new MACAddress(a.mac).integerValue !=
							new MACAddress(b.mac).integerValue) 
								changes.push(b.mac + " to " + a.mac);
							
							
							if (a.name != b.name) 
								changes.push("\"" + b.name + "\" to \"" + a.name + "\"");
							if (a.description != b.description) 
								changes.push("\"" + b.description + "\" to \"" + a.description + "\"");
							if (a.type != b.type) 
								changes.push("\"" + b.type + "\" to \"" + a.type + "\"");
							
							msg = "Changing ";
							for (var j = 0; j < changes.length; j++) {
								msg += changes[j] + ", ";
							}
							msg += " on " + b.ipAddress + " (" + b.name + ")";
						}
					}
					text += "<li>" + msg + "</li>";
				}
			}
			
			byId("slistHolder").innerHTML = "<ul>" + text + "</ul>";
		}
		else {
			//no changes
			byId("slistHolder").innerHTML = "<h1>No Differences</h1>";
		}
	
		
		
		
	}
	byId("btnSync").onclick = function(){
		if (differences == null) return;
		
		var toDelete = [];
		for(var i = 0; i < differences.length; i++)
			if (differences[i].b != null)
			toDelete.push(differences[i].b);
		
		var toAdd = [];
		for(var i = 0; i < differences.length; i++)
			if (differences[i].a != null)
			toAdd.push(differences[i].a);
		var output = "";
		for (var i = 0; i < toDelete.length; i++)
		{
			var temp = selectedScope.remove(toDelete[i].ipAddress,toDelete[i].mac);
			if (temp != null) output += "\n" + temp;
		}
		for (var i = 0; i < toAdd.length; i++)
		{
			var temp = selectedScope.reserve(toAdd[i].ipAddress,
			toAdd[i].mac,
			toAdd[i].name,
			toAdd[i].description,
			toAdd[i].type
			);
			if (temp != null) output += "\n" + temp;
		}
		alert(output);
	}
	byId("btnChange").onclick = function(){

			var ipa = byId("txtIPAddress").value;
			var mac = byId("txtMACAddress").value;
			var client = byId("txtClient").value;
			var desc = byId("txtDescription").value;
			var output = null;
			if (currentItem != null){
				output = scopeAll.remove(currentItem.ipAddress,currentItem.mac);
			}
			output = scopeAll.reserve(ipa,mac,client,desc,"BOTH");
			
			if (output == null) {
				var index = display_remove(currentItem.ipAddress, currentItem.mac);
				display_reserve(ipa, mac, client, desc, "BOTH",index);
				display_select(index);
				alert("Succeeded!");
			}
			else {
				alert("An error occurred: " + output);
				updateData();
			}
	}
	byId("btnAdd").onclick = function(){
			var scope = new DhcpScope();
			var ipa = byId("txtIPAddress").value;
			var mac = byId("txtMACAddress").value;
			var client = byId("txtClient").value;
			var desc = byId("txtDescription").value;
			
			var output = scopeAll.reserve(ipa,mac,client,desc,"BOTH");
			if (output == null) {
				display_reserve(ipa, mac, client, desc, "BOTH");
				rDataTable.selectRow(rDataTable.getLastTrEl());
				

				
				var oSortedBy = rDataTable.get("sortedBy");
				if (oSortedBy != null) {
					//get Column instance
					var oColumn = oSortedBy.column;
					
					//default sort dir
					var sortDir = (oColumn.sortOptions && oColumn.sortOptions.defaultOrder) ? oColumn.sortOptions.defaultOrder : "asc";

					//If sorted, set so direction will be toggled back
			        if(oSortedBy && (oSortedBy.key === oColumn.key)) {
			            if(oSortedBy.dir) {
			                sortDir = (oSortedBy.dir == "asc") ? "desc" : "asc";
			            }
			            else {
			                sortDir = (sortDir == "asc") ? "desc" : "asc";
			            }
			        }
					rDataTable.set("sortedBy", {key:oColumn.key, dir:sortDir, column:oColumn});
				
					//sory
					rDataTable.sortColumn(oColumn);
				}
				alert("Succeeded!");
			}
			else {
				alert("An error occurred: " + output);
				
				updateData();
			}
	}
	byId("btnRemove").onclick = function(){
			var scope = new DhcpScope();
			currentItem

			var ipa = byId("txtIPAddress").value;
			var mac = byId("txtMACAddress").value;
			var output = scopeAll.remove(ipa,mac)
			if (output == null) {
				
				
				var index = display_remove(ipa, mac);
				display_select(index);
				alert("Succeeded!");
			}
			else {
				alert("An error occurred: " + output);
				reservationArray = scope.getReservations();
				updateRList();
			}
	}
	
}
function display_select(index){
	if (index < 0) index = 0;
	if (index >= rDataTable._nTrCount.length) index = rDataTable._nTrCount -1;
	rDataTable.selectRow(index);
}

function display_remove(ipaddr,mac){
	//1) delete reservation from sorted list
	var recordArray = rDataTable.getRecordSet().getRecords();
	
	var ipInt = new IPAddress(ipaddr).integerValue;
	var mInt = new MACAddress(mac).integerValue;
	
	var recordMatch = null;
	var recordIndex = -1;
	
	for(var i = 0; i < recordArray.length; i++){
		var r = recordArray[i];
		var rip = new IPAddress(r.getData("ipAddress")).integerValue;
		var rm = new MACAddress(r.getData("mac")).integerValue;
		if (ipInt == rip && mInt == rm){
			recordIndex = i;
			recordMatch = r;
			break;
		}else if (ipInt == rip || mInt == rm){
			alert("Big problem! A match to only one of the following was found: "
			+ ipaddr + ", " + mac + " Partial match: " + r.getData("ipAddress") +
			", " + r.getData("mac"));
		}
	}
	
	rDataTable.deleteRow(recordIndex);
	return recordIndex;
}
function display_reserve(ipaddr,mac, name, desc, type,insertAt){
	
	
	//1) delete leases with same mac (from unassigned)
	var leaseArray = uDataTable.getRecordSet().getRecords();
	var mInt = new MACAddress(mac).integerValue;
	for(var i = 0; i < leaseArray.length; i++){
		var r = leaseArray[i];
		var rm = new MACAddress(r.getData("mac")).integerValue;
		if (mInt == rm){
			uDataTable.deleteRow(i);
			break;
		}
	}
	
	
	//2) add reservation in sorted list
	
	rDataTable.addRow({
		ipAddress:ipaddr, mac:mac,name:name,description:desc,type:type
	},insertAt);
	
	
}
function window_onunload(){
    
}


var level = 0;
var index = 0;
var Start = new Date();
function l(message){
    if (!chkTrace.checked) return;
    index++;
    Stamp = new Date();
    var diff = Stamp.getTime() - Start.getTime();
    
    var IsParent = false;
	if (message.length > 0) {
		if (message.substr(0, 1) == "+") {
			IsParent = true;
			message = message.substr(1, message.length - 1);
		}
	}
    
    var currentParent = document.getElementById("tracepanelist");
    if (currentParent == null) return; /// The HTML form hasn't initialized yet, so we can't do anything.
    var countdown = level;
    while(true){
        if (countdown < 1) break;
        countdown--;
        if (currentParent.lastChild == null) break;
        if (currentParent.lastChild.nodeName=="ul" || currentParent.lastChild.nodeName=="UL"){
            currentParent = currentParent.lastChild;
            
            var sib = currentParent.previousSibling;
            
            if (countdown == 0){
                if (sib.nodeName=="li" ||
                    sib.nodeName=="LI"){

                     if (message=="-"){
                        var original = sib.firstChild.innerHTML;
                        if (diff != original){
                            sib.firstChild.innerHTML = "<span class=\"tracetime\">" + (diff - original) + "ms </span>(" + original + " - " + diff + ")";
                            
                        }
                        if (sib.className=="parent"){
                            currentParent.className = "parent";
                        }
                        level--;
                        return;
                     }else{
                        sib.className="parent";
                     }
                }
            }
            
        }else break;
        
    }
    if (message=="-"){
        level--;
        return;
    }

    var newRow = document.createElement("li");
    newRow.innerHTML= "<span class=\"tracedate\">" + diff + "</span> <span class=\"traceid\">" + index + "</span>"  + message;
    currentParent.appendChild(newRow);
    
    if (IsParent) {
        var newLevel = document.createElement("ul");
        currentParent.appendChild(newLevel);
        level++;
    }
}



// This is where all IE errors within the supercopy interface are logged.
function DebugLogPath(){	return UserTempDir() + "\\SuperCopyDebug.txt";}

// Returns the full path to SuperCopy's application settings directory in the user's documents and settings directory.
// If the directory does not exist, it creates it first.
function AppSettingsRoot(){
	var sh = new ActiveXObject("WScript.Shell");
	fso = new ActiveXObject("Scripting.FileSystemObject");
	if (!fso.FolderExists(sh.ExpandEnvironmentStrings("%APPDATA%") + "\\SuperCopy")) fso.CreateFolder(sh.ExpandEnvironmentStrings("%APPDATA%") + "\\SuperCopy");
	return sh.ExpandEnvironmentStrings("%APPDATA%") + "\\SuperCopy";

}

// Returns the full path to the user's temporary files directory
function UserTempDir(){
	fso = new ActiveXObject("Scripting.FileSystemObject");
	return fso.GetSpecialFolder(2);
}
var firsterror = true;
function HandleError(desc,page,line,chr){
    var fso = new ActiveXObject("Scripting.FileSystemObject");
	var tfile = DebugLogPath();

	var file;
	if (!fso.FileExists(tfile)){
	    file = fso.OpenTextFile(tfile,2,true);
	    file.WriteLine("+++ +++ +++ Super Copy error log +++ +++ +++ ");
	    file.WriteLine("+++ +++ +++ Press F5 to update   +++ +++ +++ ");
	}else{
	    file = fso.OpenTextFile(tfile,8,true);
	}
//	  try{
//    bustMe()
//  } 
//  catch(e){ 
//    expose(e,document.getElementById("errObj"))
//  }
	file.WriteLine("An error occured in SuperCopy: " + desc + 
	"\nOn page: " + page + 
	"\nLine: " + line + 
	"\nCharacter: " + chr);

	file.WriteLine("");
	file.Close();
	
	
	if (firsterror){
	    errorlink.onclick=function(){window.open(tfile)};
	    errorlink.innerHTML="Error(s) have occurred.";
	    errorlinkdel.onclick=function(){
	        var fso;fso= new ActiveXObject("Scripting.FileSystemObject");
		fso.DeleteFile(tfile);
		errorlink.innerHTML = "";
		errorlinkdel.innerHTML = "";
		firsterror = true;
	    }
	    errorlinkdel.innerHTML="Delete log";
	    firsterror=false;
	    window.open(tfile);
	}

	return true;
}