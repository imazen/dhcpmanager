function DhcpServerGroupSharedScope(serverAddressArray, scopeAddress){
    this.serverAddresses = serverAddressArray;
    this.scopeAddress = scopeAddress;
    this.servers = new Array();
    for (var i = 0; i < this.serverAddresses.length; i++){
        servers.push(new DhcpServer(serverAddress));
    }
    
}

//Finds the first ip address not leased by any of the servers in that range.
DhcpServerGroupSharedScope.prototype.getFirstAvailableInRange = function(firstIp,lastIp){
    
}

//returns null if sucessful. Returns the text error message from servers that didn't successfully process the command.
DhcpServerGroupSharedScope.prototype.reserve = function(ipAddress ,mac, desc, type){
    var output = "";
    for (var i = 0; i < this.servers.length; i++){
        var ds = this.servers[i].scope(this.scopeAddress);
        var out = ds.reserve(ipAddress,mac,DhcpUtils.getTempClientName(ipAddress),desc,type);
        if (out != null) output += "Failed to reserve ip/mac combo on server " + this.servers[i].serverAddress + ", scope " + this.scopeAddress + "\n" + out + "\n";
    }
    if (output.length == 0) return null;
    else return output;
}

DhcpServerGroupSharedScope.prototype.remove = function(ipaddress, mac){
    var output = "";
    for (var i = 0; i < this.servers.length; i++){
        var ds = this.servers[i].scope(this.scopeAddress);
        var out = ds.remove(ipAddress,mac);
        if (out != null) output += "Failed to remove ip/mac combo on server " + this.servers[i].serverAddress + " scope " + this.scopeAddress + "\n" + out + "\n";
    }
    if (output.length == 0) return null;
    else return output;
}

DhcpServerGroupSharedScope.prototype.change = function(ipAddress, mac, desc, type){
    var del = this.delete(ipAddress, mac);
    var add = this.reserve(ipAddress, mac, desc, type);
    var output = "";
    if (del != null) output  += del;
    if (add != null) output += add;
    if (output.length == 0) return null;
    else return output;
}



//manages commands at the server level.
function DhcpServer(serverAddress){
    this.serverAddress = serverAddress;
}

//Runs a test command (show scope) against this server. Returns true if successful, false if not.
DhcpServer.prototype.checkServer = function(){
    return DhcpUtils.stringHasSuccess(this.execute("show scope"));
}

//executes the specified dhcp command and returns the text result.
DhcpServer.prototype.execute = function(command){
    var wshell = new ActiveXObject("WScript.Shell");
    var obj = wshell.exec("netsh dhcp server " + this.server + " " + command);
    return obj.stdout.readall();
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

//executes the command on the specified scope
DhcpServer.prototype.executeOnScope = function(scope, command){
    return this.execute ("scope " + scope + " " + command);
}


function DhcpScope(dhcpServer, address, subnet, state, name, comment){
    this.dhcpServer = dhcpServer;
    this.address = address;
    this.subnet = subnet;
    this.state = state;
    this.name = name;
    this.comment = comment;
}

//Executes commands in the scope context.
DhcpScope.execute = function(command){
    return this.dhcpServer.execute("scope " + address + " " + command);
}


// Reserves an ip address for the specified mac address. Returns null if successful - otherwise the output.
DhcpScope.prototype.reserve = function(ipaddress, mac, clientName, description, type){
    var command = "add reservedip " + ipaddress + " " + mac;
    if (clientName != undefined) command += " \"" + clientName + "\"";
    if (description != undefined) command += " \"" + description + "\"";
    if (type != undefined) command += " " + type;
    
    var output = this.execute(command);
    if (DhcpUtils.stringHasSuccess(output)) return null;
    return output;
}
//removes the specfied ipaddrress/mac reservation. returns null if successful - otherwise the output.
DhcpScope.prototype.remove = function(ipaddress, mac){
    var output = this.execute("delete reservedip " + ipaddress + " " + mac );
    if (DhcpUtils.stringHasSuccess(output)) return null;
    return output;
}

DhcpScope.prototype.getNonReservedClients = function(){
    var output = this.execute("show clientsv5 1");
    var result = DhcpUtils.parseListOutput(output);
    
    var nonReservedClients = new Array();
    for (var i = 0; i < result.rows.length; i++){
        var row = result.rows[i];
        if (row[3].indexOf("NEVER EXPIRES") > 0){
            //A reservation
        }else{
            //A lease
            nonReservedClients.push(new DhcpClient(this.serverAddress,this.scopeAddress,row[0],row[1],row[2],row[3],row[4],row[5]))
        }
    }
    return nonReservedClients;
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
    
    var filterReg = new RegExp(/^\s*Dhcp Server\\s+([0-9\.])+\\s+Scope\\s+([0-9\.])\\s+Add reservedip\\s+([0-9\.])\\s+([0-9abcedf])\\s+"([^"])"\\s+"([^"])"\\s+"([^"])"/i);
    
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
            results.push(new DhcpReservation(this.dhcpServer.serverAddress,this.address,captures[3],captures[4],captures[5],captures[6],captures[7]));
        }
    }
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





var DhcpUtils = new Object();
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
    
    var outputLines = getLines(str);
    
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
DchpUtils.trimString = function(str){
    return str.replace(/^\s*(\S*(\s+\S+)*)\s*$/, "$1");
}
//returns true if the specified string containts "Command completed successfully"
DhcpUtils.stringHasSuccess = function(str){
     return (str.lastIndexOf("Command completed successfully") > 0);
}



