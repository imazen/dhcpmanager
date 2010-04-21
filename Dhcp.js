function DhcpServerGroupSharedScope(serverAddressArray, scopeAddress){
    this.serverAddresses = serverAddressArray;
    this.scopeAddress = scopeAddress;
    this.servers = new Array();
    for (var i = 0; i < this.serverAddresses.length; i++){
        this.servers.push(new DhcpServer(this.serverAddresses[i]));
    }
    
}


//returns null if sucessful. Returns the text error message from servers that didn't successfully process the command.
DhcpServerGroupSharedScope.prototype.reserve = function(ipAddress ,mac, clientName, desc, type){
    var output = "";
	var success = "";
    for (var i = 0; i < this.servers.length; i++){
        var ds = this.servers[i].scope(this.scopeAddress);
        var out = ds.reserve(ipAddress,mac,clientName,desc,type);
        if (out != null) {
			output += success;
			success = "";
			output += "Failed to reserve ip/mac combo on server " + this.servers[i].serverAddress + ", scope " + this.scopeAddress + "\n" + out + "\n";
		}else{
			success = "Succeeded reserving on server " +  + this.servers[i].serverAddress + ", scope " + this.scopeAddress + "\n";
		}
		
    }
	
    if (output.length == 0) return null;
    else return output + success;
}
;
DhcpServerGroupSharedScope.prototype.remove = function(ipAddress, mac){
    var output = "";
    for (var i = 0; i < this.servers.length; i++){
        var ds = this.servers[i].scope(this.scopeAddress);
        var out = ds.remove(ipAddress,mac);
        if (out != null) output += "Failed to remove ip/mac combo on server " + this.servers[i].serverAddress + " scope " + this.scopeAddress + "\n" + out + "\n";
    }
    if (output.length == 0) return null;
    else return output;
}
//Returns an object. object.leases = getNonReservedClients()
//object.activeReservations contains a hashtable of ip hashes = true for active reservations
DhcpServerGroupSharedScope.prototype.getNonReservedClientsAndActiveArray = function(){
	
	//Get clients from all servers
	var failures = "";
	var success = "";
	
	//All leases, concatenated. (of DhcpClient objects). Filtering done later.
	var allLeases = new Array();
	var activeIpReservations = new Object();
	
    for (var i = 0; i < this.servers.length; i++){
		
		var currentServer = this.servers[i];
		
		//get output on server
        var out = currentServer.scope(this.scopeAddress).execute("show clientsv5 1");
		
		var result = DhcpUtils.parseListOutput(out);
		
		//If command completed successfully
		if (result.success){
		
			//Loop through rows and perform initial array population.
			 for (var j = 0; j < result.rows.length; j++){
        		var row = result.rows[j];
		        if (row[3].indexOf("NEVER EXPIRES") >= 0){
				    //An active reservation
					//Multiple assignments from different servers OK.
					activeIpReservations[new IPAddress(row[0]).toHashString()] = true;
					
				}else if( row[3].indexOf("INACTIVE") >= 0){ //An inactive reservation
		        }else{ //A lease
					//WS2000 and WS2003 are different
					if (row.length > 5) 
		               allLeases.push(new DhcpClient(currentServer.serverAddress,this.scopeAddress,row[0],row[1],row[2],row[3],row[4],row[5]));
		            else
		               allLeases.push(new DhcpClient(currentServer.serverAddress,this.scopeAddress,row[0],row[1],row[2],row[3],row[4],null));
		        }
   			}
			
			
			success = "Succeeded retrieving clines on server " +  + currentServer.serverAddress + ", scope " + this.scopeAddress + "\n";
		}else{
			l("Failed to get clients from server " + currentServer.serverAddress);
			failures += success;
			sucess="";
			failures  += "Failed to retrieve clients from server " +currentServer.serverAddress + ", scope " + this.scopeAddress + "\n" + out + "\n";
		}
    }
	
	
	
	var conflicts = "";
	
    var nonReservedClients = new Array();
	
	var nrcByIp = new Object();
	var nrcByMac = new Object();
	
	for (var i = 0; i < allLeases.length; i++){
		var client = allLeases[i];
		
		//hastable keys for conflict detection
		var strIp = new IPAddress(client.ipAddress).toHashString();
		var strMac = new MACAddress(client.mac).toHashString();

		//ip addresses should never overlap, since DHCP servers should be configured for different ranges
		//check anyway!
		if (nrcByIp[strIp] == null) {
			nrcByIp[strIp] = client;
		}else{
			var other = nrcByIp[strIp];
			conflicts += "Servers " + other.serverAddress + " and " + client.serverAddress + 
				" leased out the same IP address (" + other.ipAddress + ") to clients " + 
				other.dnsname + " (" + other.mac + ") and " + client.dnsname + " (" + client.mac + ")\n";
			
			//on overlap, show both. (we're allowing both reservations to be added);
		}

		//MAC addresses may overlap on different servers very often... not an error
		//Choose the lease with the farthest expiration date.
		
		if (nrcByMac[strMac] == null){
			nrcByMac[strMac] = client;
			
			//add item
	        client.index = nonReservedClients.length;
	        nonReservedClients.push(client);
		}else{
			
			//conflict - choose newest (active) lease.
			var other = nrcByMac[strMac];
			
			var d1 = new Date(other.expires);
			var d2 = new Date(client.expires);
			l("Two leases found for the same client. Lease 1 expires " + d1.toString() + " Lease 2 expires " + d2.toString());
			
			if (!(d1 instanceof Date) || !(d2 instanceof Date)){
				alert("Error parsing date!");
			}
			if (d2 > d1){
				//replace other in array
				nonReservedClients[other.index] = client;
			}
		}
	}
	
	//Report any failures
    if (failures.length > 0) failures += success;
	if (conflicts.length > 0) failures += "\n==== Conflicts ====: \n\n" + conflicts;
	if (failures.length > 0) {
		l(failures);
		alert(failures);
	}

	
    return {
		leases: nonReservedClients,
		activeReservations: activeIpReservations
	};
}



//manages commands at the server level.
function DhcpServer(serverAddress){
	if (serverAddress instanceof DhcpServer)
		this.serverAddress = serverAddress.serverAddress;
	else
    	this.serverAddress = serverAddress;
}

//Runs a test command (show scope) against this server. Returns true if successful, false if not.
DhcpServer.prototype.checkServer = function(){
    return DhcpUtils.stringHasSuccess(this.execute("show scope"));
}

//executes the specified dhcp command and returns the text result.
DhcpServer.prototype.execute = function(command){
	if (document.all) {
		var wshell = new ActiveXObject("WScript.Shell");
		l("Executing " + "netsh dhcp server " + this.serverAddress + " " + command);
		var obj = wshell.exec("netsh dhcp server " + this.serverAddress + " " + command);
		l("Executed " + "netsh dhcp server " + this.serverAddress + " " + command);
		var out = obj.stdout.readall();
		l("Acquired output");
		return out;
	}
	else {
		//var responses = [{"scope 192.168.0.0 s"}];
		return "Command completed successfully";
	}
	
}


//returns an array of DhcpScope objects
DhcpServer.prototype.getScopes = function(){
    var output = DhcpUtils.parseListOutput(this.execute("show scope"));
    var scopes = new Array();
    for (var i = 0; i < output.rows.length; i++){
        var row = output.rows[i];
        scopes.push(new DhcpScope(this, row[0],row[1],row[2],row[3],row[4],row[5]));
    }
    return scopes;
}

DhcpServer.prototype.scope = function(scopeAddress){
    return new DhcpScope(this,scopeAddress)
}


function DhcpScope(dhcpServer, scopeAddress, subnet, state, name, comment){
    this.dhcpServer = dhcpServer;
    this.scopeAddress = scopeAddress;
    this.subnet = subnet;
    this.state = state;
    this.name = name;
    this.comment = comment;
}

//Executes commands in the scope context.
DhcpScope.prototype.execute = function(command){
    return this.dhcpServer.execute("scope " + this.scopeAddress + " " + command);
}


// Reserves an ip address for the specified mac address. Returns null if successful - otherwise the output.
DhcpScope.prototype.reserve = function(ipAddress, mac, clientName, description, type){
	ipAddress =new IPAddress(ipAddress).toString();
    var command = "add reservedip " + ipAddress + " " + new MACAddress(mac).toString();
    
	if (clientName != undefined) command += " \"" + clientName + "\"";
	else command += " \"" + DhcpUtils.getTempClientName(ipAddress) + "\"";
	
    if (description != undefined) command += " \"" + description + "\"";
	else command += " \"\"";
    if (type != undefined) command += " " + type;
    
    var output = this.execute(command);
    if (DhcpUtils.stringHasSuccess(output)) return null;
    return "Attempted to execute: \"" + command + "\"\n" + output;
}
//removes the specfied ipaddrress/mac reservation. returns null if successful - otherwise the output.
DhcpScope.prototype.remove = function(ipAddress, mac){
	var cmd ="delete reservedip " + new IPAddress(ipAddress).toString()
			 + " " + new MACAddress(mac).toString();
    var output = this.execute(cmd);
    if (DhcpUtils.stringHasSuccess(output)) return null;
    return "Failed executing \"" + cmd + "\"\n" + output;
}

DhcpScope.prototype.getNonReservedClients = function(){
    var output = this.execute("show clientsv5 1");

    var result = DhcpUtils.parseListOutput(output);
    if (!result.success) {
		alert("Failed to get client list: \"" + output + "\"");
		return new Array();
	}
	
    var nonReservedClients = new Array();
    for (var i = 0; i < result.rows.length; i++){
        var row = result.rows[i];
        if (row[3].indexOf("NEVER EXPIRES") >= 0 || row[3].indexOf("INACTIVE") >= 0){
            //A reservation
        }else{
            //A lease
            if (row.length > 5) //ws2000
                nonReservedClients.push(new DhcpClient(this.serverAddress,this.scopeAddress,row[0],row[1],row[2],row[3],row[4],row[5]));
            else
                nonReservedClients.push(new DhcpClient(this.serverAddress,this.scopeAddress,row[0],row[1],row[2],row[3],row[4],null));
        }
    }
    return nonReservedClients;
}

DhcpScope.prototype.getClients = function(){
    var output = this.execute("show clientsv5 1");

    var result = DhcpUtils.parseListOutput(output);
        if (!result.success) {
		alert("Failed to get client list: \"" + output + "\"");
		return new Array();
	}
	
    var clients = new Array();
    for (var i = 0; i < result.rows.length; i++){
        var row = result.rows[i];
        if (row.length > 5) //ws2000
            clients.push(new DhcpClient(this.serverAddress,this.scopeAddress,row[0],row[1],row[2],row[3],row[4],row[5]));
        else
            clients.push(new DhcpClient(this.serverAddress,this.scopeAddress,row[0],row[1],row[2],row[3],row[4],null));
    
    }
    return clients;
}


//currentClients is an (optional) array of DHCPClient objects. Will query if null
//Returns an IPAddress instance. Returns null if none are available
DhcpScope.prototype.firstUnusedInRange = function(startAddress, lastAddress, currentClients){
	var sa = new IPAddress(startAddress).integerValue;
	var la = new IPAddress(lastAddress).integerValue;
	
	if (currentClients == null){
		currentClients = this.getClients();
	}
	
	//create hash table for quick lookup (internally uses a binary tree)
	var used = new Object();
	for (var i = 0; i < currentClients.length;i++){
		var ipStr = currentClients[i].ipAddress;
		used["ip" + new IPAddress(ipStr).integerValue.toString(16)] = true;
	}
	
	for (var i = sa; i <= la; i++) {
		var checkStr = "ip" + i.toString(16);
		if (used[checkStr] != true) {
			return new IPAddress(i);
		}
	}
	return null;
}

function DhcpPair(a, b){
	this.a = a;
	this.b = b;
}

//Compares reservations with a different scope instance (on another server)
//returns an array of DhcpReservation pairs that differ
//Deletions MUST occur first to prevent key crossing conflicts
DhcpScope.prototype.compareReservations = function(otherScope){
	var thisR = this.getReservations();
	var otherR = otherScope.getReservations();
	
	var exactmatches = new Object();
	var byuniquekey = new Object();
	
	for(var i = 0; i < thisR.length; i++){
		exactmatches[thisR[i].getHashString()] = thisR[i];
		byuniquekey[new MACAddress(thisR[i].mac).toHashString()] = thisR[i];
		byuniquekey[new IPAddress(thisR[i].ipAddress).toHashString()] = thisR[i];
	}
	
	//get additional and different in b
	var different = [];

	for (var i =0; i < otherR.length;i++){
		var str = otherR[i].getHashString();
		
		var strm =new MACAddress(otherR[i].mac).toHashString();
		var stri = new IPAddress(otherR[i].ipAddress).toHashString();

		var bym = byuniquekey[strm]; byuniquekey[strm] = null; //remove
		var byi = byuniquekey[stri]; byuniquekey[stri] = null; //remove
		
		//Exclude exact matches ASAP (most of work)
		if (exactmatches[str] == null) {
			
			//no exact match
			if (bym == null && byi == null) {
				//Deleted item
				different.push(new DhcpPair(null, otherR[i]));
			}else if (byi == bym){
				//name, desc, or type field changed
				different.push(new DhcpPair(byi, otherR[i]));
			}else if (byi == null || bym == null){
				//mac or ip address changed
				different.push(new DhcpPair(byi, otherR[i]));
			}
			else{
				//crossed pairs. Both the mac and ip address are used,
				//but on different reservations.
				//the using algorithm should delete first to avoid issues
				different.push(new DhcpPair(bym, null));
				different.push(new DhcpPair(byi,otherR[i]));
				
				//Crossed pairs the other direction are handled by
				//deleted item. 
			}
		}
	}
	
	
	var distinctnew = new Object();
	//Get distinct remaining items (new items)
	for (var key in byuniquekey) {
		var obj = byuniquekey[key];
		if (obj != null) {
			var str = obj.getHashString();
			if (distinctnew[str] == null) {
				distinctnew[str] = obj;
				different.push(new DhcpPair(obj, null));
			}
		}
		
	}
	return different;
}
function DhcpClient(serverAddress, scopeAddress, ipAddress, subnet, mac, expiration, state, dnsname){
    this.serverAddress = serverAddress;
    this.scopeAddress = scopeAddress;
    this.ipAddress = ipAddress;
    this.subnet = subnet;
    this.mac = mac;
    this.expiration = expiration;
    this.state = state;
    this.dnsname = dnsname;
}


DhcpScope.prototype.getReservations = function(){
    var output = this.execute("dump");
    //get all "add reservedip" commmands
    var lines = DhcpUtils.getLines(output);
    
    var filterReg = new RegExp(/^\s*Dhcp Server\s+([0-9\.]+)\s+Scope\s+([0-9\.]+)\s+Add reservedip\s+([0-9\.]+)\s+([0-9abcdefABCDEF]+)\s+"([^"]*)"\s+"([^"]*)"\s+"([^"]*)"/i);
    
	var badlines = [];
    var results = new Array();
    for (var i = 0; i < lines.length; i++){
        if (lines[i].match(filterReg)){
            var captures = filterReg.exec(lines[i]);
            //captures[0] = line
            //captures[1] = server
            //captures[2] = scope
            //captures[3] = reservedip
            //captures[4] = mac (no dashes)
            //captures[5] = dns
            //captures[6] = desc
            //captures[7] = type
		//	if (captures[6] == "both"){
		//		badlines.push({
		//			line: lines[i], caps:captures
		//		});
		//	}
            results.push(new DhcpReservation(this.dhcpServer.serverAddress,this.scopeAddress,captures[3],captures[4],captures[5],captures[6],captures[7]));
			
        }
    }
	var msg = "";
	for (var i = 0; i < badlines.length; i++){
		msg += "Line: \"" + badlines[i].line + "\" Captures: " + DhcpUtils.join(badlines[i].caps,", ");
	}
	if (badlines.length  > 0) alert(msg);
    return results;
}



function DhcpReservation(serverAddress,scopeAddress, ipAddress, mac, name, description, type){
    this.serverAddress = serverAddress;
    this.scopeAddress = scopeAddress;
    this.ipAddress = ipAddress;
    this.mac = mac;
    this.name = name;
    this.description = description;
    this.type = type;
}
DhcpReservation.prototype.getHashString = function(){
	return "r" +
	 new IPAddress(this.ipAddress).integerValue.toString(16) +
	 new MACAddress(this.mac).integerValue.toString(16) +
	this.name + "____" + this.description + "___" + this.type;
}
DhcpReservation.prototype.toString = function(){
	return "hi";
	l(this.ipAddress);
	return 
	 (new IPAddress(this.ipAddress).toString()) + " " +
	 (new MACAddress(this.mac).toSegmentedString()) + " " +
	this.name + " \"" + this.description + "\" \"" + this.type + "\"";
}

//period-delimited string or a 4-byte integer
function IPAddress(val){
	if (val instanceof IPAddress){
		this.integerValue = val.integerValue;
	}else
	if (typeof(val) == "string") {
		this.integerValue = this.stringToInt(val);
	}
	else {
		this.integerValue = val;
	}
	if (this.integerValue < 1) l("Invalid IP Address: " + val );
}

IPAddress.prototype.stringToInt = function(str){
		var octets = new String(str).split("."); //array
		if (octets.length != 4) alert("Invalid IP address - exactly 4 segments are required: " + str);
		var total = 0;
		for (var i = 0; i < octets.length; i++) {
			var octet = parseInt(octets[i]);
			if (octet > 255 || octet < 0) alert("Invalid IP address octet:" + octet);
			total += Math.pow(256,(3 - i)) * octet;
		}
		return total;
}
IPAddress.prototype.intToString = function(fourByteInt){
	var str = "";
	var remainder = fourByteInt;
	for (var i = 3.0; i >= 0; i--){
		var level = Math.pow(256, i);
		var octet = Math.floor(remainder / level);
		if (octet > 255) 
			alert("Invalid IP address:" + fourByteInt.toString(16) + "Octet " + (4-i).toString() + " = " + octet.toString());
		remainder = remainder - (octet * level); //remove this octet so future octets can be parsed.
		if (octet > 255) octet = 255;
		str += octet.toString();
		if (i > 0) str += ".";
	}
	return str;
}

IPAddress.prototype.toString = function(){
	return this.intToString(this.integerValue);
}
IPAddress.prototype.toHashString = function(){
	return ("i" + this.integerValue.toString(16));
}

function MACAddress(val){
	if (val instanceof MACAddress){
		this.integerValue = val.integerValue;
	}else
	if (typeof(val) == "string") {
		this.integerValue = this.stringToInt(val);
	}
	else {
		this.integerValue = val;
	}
	if (this.integerValue < 1) l("Invalid MAC Address: " + val );
}

MACAddress.prototype.stringToInt = function(str){
		return parseInt(str.replace(/-/g,""),16);
}
MACAddress.prototype.intToByteSegmented = function(sixByteInt,character){
	var plain = DhcpUtils.padLeft(this.integerValue.toString(16),12,'0');
	var segmented = "";
	for (var i = 0; i < plain.length; i ++){
		if (i > 0) {
			if (i % 2 == 0) {
				segmented += character;
			}
		}
		segmented += plain.charAt(i);
	}
	return segmented;
}

MACAddress.prototype.toString = function(){
	return DhcpUtils.padLeft(this.integerValue.toString(16),12,'0');
}
MACAddress.prototype.toSegmentedString = function(character){
	if (character == null) character = '-';
	return this.intToByteSegmented(this.integerValue,character);
}
MACAddress.prototype.toHashString = function(){
	return "m" + this.integerValue.toString(16);
}

var DhcpUtils = new Object();

DhcpUtils.padLeft = function(text,count,character){
	var padding = "";
	for (var i = 0; i < count - text.length; i++) padding += character;
	return padding + text;
}
DhcpUtils.padRight = function(text,count,character){
	var padding = "";
	for (var i = 0; i < count - text.length; i++) padding += character;
	return text + padding;
}
//Splits the string into lines
DhcpUtils.getLines = function(str){
    return str.split(/[\r]?[\n]/);
}
DhcpUtils.getTempClientName = function(ipAddress){
    return "temp" + ipAddress.replace(/[^0-9]/,"");
}
//returns an object with a rows property, a success property, and a reportedNumber property
//parses most dhcp output
DhcpUtils.parseListOutput = function(str){
    
    var outputLines = DhcpUtils.getLines(str);
    
    var result = new Object();
    
    result.success = DhcpUtils.stringHasSuccess(str);
    
    
    var lastEquals = str.lastIndexOf("=");
    if (lastEquals > 0){
        var nextNewline = str.indexOf("\n",lastEquals);
        if (nextNewline < 0) nextNewline = str.length;

        result.reportedNumber = parseInt(DhcpUtils.trimString(str.substr(lastEquals,nextNewline)));
    }
    
    result.rows = new Array(); 
    //Output format
    //misc
    //=======
    //misc
    // =====
    
    //scopes, with fields
    //
    //Total No. of Scopes = X
    //
    //Command completed successfully
    
    //Skip the first 4 lines. As soon as valid data is encountered, start reading. Once whitespace or empty lines are encountered, stop.
    var hasHitData = false;
    var hasHitEnd = false;
    var horizontalLineCount = 0;
    for (var i = 0; i < outputLines.length; i++){
        var trimmed = DhcpUtils.trimString(outputLines[i]);
               
        if (trimmed.length == 0){
            if (hasHitData) hasHitEnd = true;
            else continue;
        }
        if (trimmed.indexOf("=") == 0 && trimmed.lastIndexOf("=") == trimmed.length - 1){
            //horizontal bar
            horizontalLineCount++;
            continue;
        }
        //don't try to read data until we have passed both lines (the header)
        if (horizontalLineCount < 2) continue;
        
        if (!hasHitEnd && trimmed.indexOf("-") > 0){
            hasHitData = true;
            //K, we've got a row
            var fields = trimmed.split(/(\s+-\s*|\s*-\s+)/); //split, and trim parts
            result.rows.push(fields);
            continue;
        }else{
            if (hasHitData) hasHitEnd =true;
        }
        
        if (hasHitEnd && i < outputLines.length - 4){
            //Looks like a bug
            alert("Error: hit end of data too soon on \"" + trimmed + "\"");
        }
        if (hasHitEnd) break;
    }
    return result;
}
//trims leading and trailing whitespace from the specified string
DhcpUtils.trimString = function(str){
    return str.replace(/^\s*(\S*(\s+\S+)*)\s*$/, "$1");
}
//returns true if the specified string containts "Command completed successfully"
DhcpUtils.stringHasSuccess = function(str){
     return (str.lastIndexOf("Command completed successfully") > -1);
}
DhcpUtils.join = function(arr, delimiter){
	var str = "";
	for (var i =0; i < arr.length; i++){
		str += arr[i];
		if (i < arr.length -1) str += delimiter;
	}
	return str;
}


