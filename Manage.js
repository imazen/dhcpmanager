// VBScript source code
start();
var scopes;
var synccount;
var argerror;
var iparray;
var macarray;
var finaliparray;
var finalmacarray;
var m;
var args

function start(){

 args=0 ;
 synccount=0;
 argerror=0;
 if(wscript.arguments.count=0)){
 wscript.echo "enter the command";
 exit sub;
 }

 for i=0 to wscript.arguments.count-1;
 if(i=0)){
 str=wscript.arguments.item(i);
 }else{
 str=str+" "+wscript.arguments.item(i);
 } ;
 next;

 str1=split(str)

 //show error if(null is entered------------

 if((not isarray(str1))){
 wscript.echo "Error: unrecongnized || incomplete command line.";
 helpfile();
 exit sub;
 }


 //checking if(the command is Rmanager || !

 if(strcomp("Rmanager",str1(0))!=0)){
 wscript.echo "Error: unrecongnized || incomplete command line.";
 helpfile();
 exit sub;
 }

 //checking for different cases after Rmanager;
 if(ubound(str1)=0)){
 wscript.echo "Error: unrecongnized || incomplete command line.";
 helpfile();
 exit sub;
 }
 switch(str1(1)){

 case "-migrate": {

  migrate(str1);

  break;
 }
 case "-sync";

  migrate(str1);
  if(argerror=1)){
  exit sub;
  }
  synccount=1;
  a=str1(2);
  str1(2)=str1(3);
  str1(3)=a;
  migrate(str1) 

 case "-dumplease": {

  dump(str1);

  break;
 }
 case "-makereservation": {

  makereservation(str1);

  break;
 }
 case "/?": {

  helpfile();

  break;
 }
 case }else{
  wscript.echo "Error: unrecongnized || incomplete command line.";
  helpfile();

  }

//delete the scopefile that is created during the program 

fso = new ActiveXObject("Scripting.FileSystemObject");
if(fso.fileexists("scopefile.txt"))then
fso.deletefile("scopefile.txt"),true;
}


}


// function for dumplease{

function dump(str1){

//if(improper arguments are entered show error

if(ubound(str1)<4){       
wscript.echo "Error: unrecongnized || incomplete command line.";
helpfile();
exit sub;
}

filename = str1(2)
fso = new ActiveXObject("Scripting.FileSystemObject");
outfile = fso.CreateTextFile(filename);
 outfile.close

p=checkserver(str1(3))

if(p==0){
wscript.echo "server "+str1(3)+" ! present || is entered wrongly";
exit sub;
}

serverarray = makescopearray(scopes)

if(! isarray(serverarray)){
wscript.echo "no scopes in server "+str1(3);
exit sub;
}

if((strcomp(str1(4),"all")==0)){

 if(ubound(str1)=4)){
 scope = serverarray;
 }else{
 wscript.echo "improper arguments";
 }

}else{

for i = 4 to ubound(str1);
if(isscope(str1(i),serverarray))){
revar preserve scope(i-4);
scope(i-4)=str1(i);
}else{
wscript.echo "scope "+ str1(i) +" is ! present in server "+str1(3);
exit sub;
}
next;
}
//scope contains all the scopes entered
if(! isarray(scope)){
wscript.echo "no scopes in the server "+str1(3);
}else{
if(scope(0)==""){
wscript.echo "no scopes in the server "+str1(3);
}else{
wshell = new ActiveXObject("WScript.Shell");

 for i = 0 to ubound(scope);
obj = wshell.exec("netsh dhcp server "+str1(3)+" scope "+scope(i)+" show clients");
 clients = obj.stdout.readall();
 if(instrrev(clients,"Command completed successfully.")=0)){
 exit sub;
 } ;
 makeclients(clients,str1(2)) ;
 next;
}
}
if(args == 0){
}else{
wscript.echo "the ipaddress && macaddress pair are in file "+filename;
}
}

//the following procedure outputs the ip && corresponding mac addresses(active leases) into the file - 'filename'...it takes the output string clients that we get after executing the command shoe clients

function makeclients(clients,filename){

fso = new ActiveXObject("Scripting.FileSystemObject");
scopefile = fso.CreateTextFile("scopefile.txt");
 scopefile.writeline(clients);
 scopefile.close;


scopefile = fso.OpenTextFile("scopefile.txt");
   do While ! scopefile.AtEndOfStream   //reading line by line && checking for the string "Total No. of Scopes";

    line = scopefile.ReadLine;

   if(instr(line,"No of Clients")=1)){  ;
   str = split(line);

   t=str(4)        //taking no. of clients into t;
   exit do;

   }

   loop   

   scopefile.close;

   t=cint(t)    

   if(t==0){
   wscript.echo "no clients in the scope "+str(ubound(str));

   exit sub;
   }
args=args+1
scopefile = fso.OpenTextFile("scopefile.txt");
for i= 1 to 8;
scopefile.skipline;
next     ;

outfile = fso.opentextfile(filename,8)

for i=0 to t-1;
line=scopefile.readline

str= split(line)

if((instr(line,"INACTIVE")!=0)){
d=0;
 for l=0 to ubound(str);
 if(str(l)="")){
 }else{
 if(d==3){
 exit for;
 }else{
 d=d+1 ;
 }
 }
 next;

outfile.write(str(0));
for size = 1 to 18-(len(str(0)));
outfile.write(" ");
next

outfile.writeline(trim(replace(str(l),"-","")))

}else{
d=0;
 for l=0 to ubound(str);
 if(str(l)="")){
 }else{
 if(d==4){
 exit for;
 }else{
 d=d+1 ;
 }
 }
 next;
outfile.write(str(0));
for size = 1 to 18-(len(str(0)));
outfile.write(" ");
next

outfile.writeline(trim(replace(str(l),"-","")))


}
next;
outfile.close;
}

function makereservation(str1){

if(ubound(str1)!=3){
wscript.echo "Error: unrecongnized || incomplete command line.";
helpfile();
exit sub;
}

server = str1(2);
filename = str1(3);

fso = new ActiveXObject("Scripting.FileSystemObject");
if(not fso.fileexists(filename))then
wscript.echo "file "+filename+" ! present";
exit sub;
}

k = checkserver(server);
if(k==0){
wscript.echo "server "+server+" is ! present || may have been entered wrongly";
exit sub;
}

scopearray=makescopearray(scopes)       //scopes is the output string obtained after executing show scope command for given server;

handle = fso.opentextfile(filename)

var ipaddress;
var macaddress;
t=0;
do while ! handle.atendofstream

 line=trim(handle.readline);
 line=replace(line," ","") ;
 if(line==""){

 }else{
  strarray=split(line)

  p=0

  for k=0 to ubound(strarray);
   if(strarray(k)==""){

   }else{

    if(p==0){ ;
    ipaddress=trim(strarray(k));
    }else{ if(p==1){
    macaddress = trim(strarray(k));
    }
    }
    p=p+1;
    //wscript.echo Replace(ipaddress, " ", "");
    //wscript.echo macaddress;
   }
  next;

  if(p!=2){
  wscript.echo "improper format of file";
  exit sub;
  }

 revar preserve iparray3(t);
 revar preserve macarray3(t);
 iparray3(t)=ipaddress;
 macarray3(t)=macaddress;
 t=t+1;
 }
 

loop;
handle.close

if(! isarray(iparray3)){
wscript.echo "there is null in the file";
exit sub;
}

var arr;
revar arr(t-1);

for i = 0 to ubound(scopearray);
 
iprange = fso.createtextfile("iprangefile.txt");
iprange.close;
arraysize = 0;
var iparray1;
revar iparray1(0);
revar macarray1(0)

 wshell = new ActiveXObject("WScript.Shell");
obj = wshell.exec("netsh dhcp server "+server+" scope "+scopearray(i)+" show iprange");
 range = obj.stdout.readall();

iprange = fso.opentextfile("iprangefile.txt",8);
 iprange.writeline(range);
 iprange.close;
iprange = fso.opentextfile("iprangefile.txt");

 for p=0 to 5;
 iprange.skipline;
 next;
 line1=iprange.readline;
 line2=split(line1);

 count=0;

 for j=0 to t-1;

 k = checkiprange(line2(3),line2(13),iparray3(j));

 if(k == 1){

 revar preserve iparray1(arraysize);
 revar preserve macarray1(arraysize);
 iparray1(arraysize) = iparray3(j);
 macarray1(arraysize) = macarray3(j) ;
 arraysize = arraysize + 1;
 arr(j)=1;
 }else{ if(k==2){
 wscript.echo "the ip address "+iparray3(j)+" is ! valid" ;
 fso.deletefile("iprangefile.txt"),true;
 exit sub;
 } ;
 }
 next 

iprange.close


if(isarray(iparray1) && ! iparray1(0)=""){

addreservation(server,scopearray(i),iparray1,macarray1) 

if((finaliparray(0)=="")){

}else{
for l=0 to ubound(finaliparray)
obj = wshell.exec("netsh dhcp server "+server+" scope " +scopearray(i)+ " add reservedip "+finaliparray(l)+" "+finalmacarray(l) );
outp =  obj.stdout.readall();
  if(instr(outp,"Command completed successfully.")!=0)){
  wscript.echo "added reservation "+finaliparray(l)+ " "+finalmacarray(l)+" to server "+server+" in scope "+scopearray(i);
  }else{

  wscript.echo "The specified IP address "+finaliparray(l)+ " || hardware address "+ finalmacarray(l)+ " is either ! proper || is being used by another client.";
  }
next;
}

}
revar iparray1(0);
revar macarray1(0)

next;

handle = fso.opentextfile(filename);
for i=0 to ubound(arr);
str=trim(handle.readline)

if(arr(i)=0)){
line=split(str)

wscript.echo "The ipaddress "+iparray3(i)+" is ! present in any scope";
}
next;
handle.close;
fso.deletefile("iprangefile.txt"),true;
}

function addreservation(server,scopestr,iparraysource,macarraysource){

 revar finaliparray(0);
 revar finalmacarray(0);
wshell = new ActiveXObject("WScript.Shell");
obj = wshell.exec("netsh dhcp server "+server+" scope " +scopestr+ " show reservedip" );
 outpdest = obj.stdout.readall()

 makeipandmacarray(outpdest);
 iparraydest = iparray;
 macarraydest = macarray   ;

 // remove common ip && mac pair between the two servers for the given scope;

 if(not isarray(iparraydest))){
  finaliparray=iparraysource ;
  finalmacarray=macarraysource ;

 }else{
  k=0;

  for i = 0 to ubound(iparraysource);
  flag=0;
   for j=0 to ubound(iparraydest);
    if(iparraysource(i)=iparraydest(j) && macarraysource(i)=macarraydest(j))){
    flag=1;
    exit for;
    }
   next;

  if(flag==1){

   if(synccount = 0 && m=0){

  wscript.echo "reservation "+iparraysource(i)+" "+macarraysource(i)+" is already present on server "+server;
   }
  }else{

  revar preserve finaliparray(k) ;
  revar preserve finalmacarray(k);
  finaliparray(k)=iparraysource(i);
  finalmacarray(k)=macarraysource(i) ;
  k=k+1   ;
  }
  next;
 }

}

function checkiprange(ip1,ip2,ip3){

str2=split(ip1,".");
str3=split(ip2,".");
str4=split(ip3,".");
if(ubound(str4)!=3){
checkiprange=2;
exit function;
}

var string

if(cint(str2(0))<=cint(str4(0)) && cint(str4(0))<=cint(str3(0))){
 if(cint(str2(1))<=cint(str4(1)) && cint(str4(1))<=cint(str3(1))){
  for i=2 to 3;
if(cint(str2(i))>=0 && cint(str2(i))<10)){
string1=string1+"00"+str2(i);
}else{ if(cint(str2(i))>=10 && cint(str2(i))<100)){
string1=string1+"0"+str2(i);
}
}
next;
for i=2 to 3;
if(cint(str3(i))>=0 && cint(str3(i))<10)){
string2=string2+"00"+str3(i);
}else{ if(cint(str3(i))>=10 && cint(str3(i))<100)){
string2=string2+"0"+str3(i);
}
}
next


for i=2 to 3;
if(cint(str4(i))>=0 && cint(str4(i))<10)){
string3=string3+"00"+str4(i);
}else{ if(cint(str4(i))>=10 && cint(str4(i))<100)){
string3=string3+"0"+str4(i);
}
}
next

if(cint(string1)<=cint(string3) && cint(string3)<=cint(string2))){
checkiprange=1;
}else{
checkiprange=0;
}

 }else{
 checkiprange=0;
 }
}else{
checkiprange=0;
}
}

function helpfile(){

fso = new ActiveXObject("Scripting.FileSystemObject")
help = fso.OpenTextFile("help.txt")

do while ! help.atendofstream

wscript.echo (help.readline)

loop

}

// this function will return 1 if(the scope(scopestr) is present in the given server(serverarray....this is an array of server scopes)(be it source || destination)...}else{ 0



  


//this function takes as argument the output string that we get after the command show scope is executed && returns
//the array of all scopes present in the server

function makescopearray(scopes){

  fso = new ActiveXObject("Scripting.FileSystemObject");
  scopefile = fso.CreateTextFile("scopefile.txt");
   scopefile.writeline(scopes)           //writing output string to a file;
   scopefile.close;

  scopefile = fso.OpenTextFile("scopefile.txt");
   do While ! scopefile.AtEndOfStream   //reading line by line && checking for the string "Total No. of Scopes";

    line = scopefile.ReadLine;

   if(instr(line,"Total No. of Scopes")=2)){  ;
   str = split(line);
   t=str(ubound(str)-1)        //taking no. of scopes into t;
   exit do;
   }

   loop   

   scopefile.close;

   t=cint(t)      //converting string to integer;

   if(t==0){      //if(no scopes are present;

   makescopearray=""     ;
   }else{

  scopefile = fso.OpenTextFile("scopefile.txt")    ;
   for i=1 to 5;
   scopefile.skipline     //skipping first five lines;
   next    ;
   for i=0 to t-1;
   str3=trim(scopefile.readline);

   str3 = split(str3," ");

   revar preserve serverscope(i);
   serverscope(i)=str3(0)     //adding scopes to array serverscope;

   next;
   makescopearray = serverscope    //returning the array to calling function;
   scopefile.close;
   }
}

 

//function to take reservations from source server && add to destination server for a given scope{

function reservedip(sourceadd,destadd,scopestr,filename,command){

 var outp;
wshell = new ActiveXObject("WScript.Shell");
obj = wshell.exec("netsh dhcp server "+sourceadd+" scope " +scopestr+ " show reservedip" );
 outpsource = obj.stdout.readall()

 makeipandmacarray(outpsource);
 iparraysource = iparray;
 macarraysource = macarray;

 if(not isarray(iparraysource))){
 wscript.echo "no reservations in the scope "+scopestr+" on the server "+sourceadd;
  exit sub;
 }
 

 if(m=1 || m=2)){

fso = new ActiveXObject("Scripting.FileSystemObject");
outfile = fso.openTextFile(filename,8)

 for i=0 to ubound(iparraysource)  ;
 outfile.writeline("netsh dhcp server "+destadd+ " scope " +scopestr+ " add reservedip " +iparraysource(i)+ " " + macarraysource(i));
 next;
 outfile.close;
 exit sub;
 }


addreservation(destadd,scopestr,iparraysource,macarraysource)

//now finaliparray && finalmacarray contain only the unique ip && mac addresses

if((not isarray(finaliparray) || finaliparray(0)="")){
if(((m=1 || m=2))){
  if((strcomp(command,"-migrate")=0 || (strcomp(command,"-sync")=0 && synccount=1))){
  wscript.echo"output is in file "+filename;
  } ;
 }

 exit sub;
 }

t=ubound(finaliparray);

 wshell = new ActiveXObject("WScript.Shell");
  for i=0 to t;
 obj = wshell.exec("netsh dhcp server "+destadd+" scope " +scopestr+ " add reservedip " +finaliparray(i)+ " " + finalmacarray(i));
  outp =  obj.stdout.readall();
  if(instr(outp,"Command completed successfully."))){
  wscript.echo "added reservation "+finaliparray(i)+ " "+finalmacarray(i)+" to server "+destadd+" in scope "+trim(scopestr);
  }else{

  wscript.echo "The specified IP address "+finaliparray(i)+ " || hardware address "+ finalmacarray(i)+ " is being used by another client.";
  }

  next;

 if(((m=1 || m=2))){
  if((strcomp(command,"-migrate")=0 || (strcomp(command,"-sync")=0 && synccount=1))){
  wscript.echo"output is in file "+filename;
  } ;
 }
}

function makeipandmacarray(outp){


 revar iparray(0);
 revar macarray(0)

fso = new ActiveXObject("Scripting.FileSystemObject");
scopefile = fso.CreateTextFile("scopefile.txt");
 scopefile.writeline(outp);
 scopefile.close;

scopefile = fso.openTextFile("scopefile.txt");


 do While ! scopefile.AtEndOfStream;
 line = scopefile.ReadLine;
 if(instr(line,"No of ReservedIPs")=1)){
 str = split(line);
 t=str(4)         //taking no. of reservations into t;
 exit do;
 }
 loop   ;

 scopefile.close;

 if(t==0){
 iparray = "";
 macarray = "";
 exit sub;

 }else{
scopefile = fso.openTextFile("scopefile.txt");

 for i=1 to 7;
 scopefile.skipline;
 next;

 for i=1 to t;
 revar preserve iparray(i-1);
 revar preserve macarray(i-1);
 string1=split(trim(scopefile.readline));

 iparray(i-1)=string1(0);
 macarray(i-1)=replace(string1(ubound(string1)),"-","");
 next;
 }
 scopefile.close;

}

function migrate(str1){

  if(ubound(str1)<4){        // ensures that the command entered has required no. of arguments ;
         wscript.echo "Error: unrecongnized || incomplete command line.";
  helpfile();
  argerror=1;
  exit sub;
  }
  var k     

  k = checkserver(str1(2))               //checking if(the source server exists || not...;
              //or if(they are entered correct || !;
  if(k==0){
  wscript.echo "server "+str1(2)+ " ! present || is entered wrongly";
  argerror=1;
  exit sub;
  }

  scopes1 = scopes;

  k = checkserver(str1(3))   ;
  if(k==0){
  wscript.echo "server "+str1(3)+ " ! present || is entered wrongly";
  argerror=1;
  exit sub;
  }

  scopes2 = scopes   ;

//comes here if(both servers are entered correctly

   sourcescope = makescopearray(scopes1)      //sourcescope here has all scopes from source server;
   if(isarray(sourcescope))){     //checking if(there are any scopes in source server  ;
   }else{
   wscript.echo "no scopes present on server "+str1(2) ;
   argerror=1;
   exit sub;
   }  ;

   bound=ubound(str1);
   if(strcomp(str1(4),"all")=0)){           //checking if(the option "all" is entered;
    if(bound>4 && bound<7)){
     if(strcomp(str1(5),"-preview")!=0)){
      argerror=1;
      wscript.echo "Error: unrecongnized || incomplete command line.";
      helpfile();
      exit sub;
     }else{
      if(bound=6)){
      filename = str1(6);
      m=2;
      }else{
      m=1;
      filename = "output.txt";
      }
     }
    }else{
     m=0;
    }

    scope=sourcescope       //scope array now contains all the scopes from source server ;
    

   }else{

    if(strcomp(str1(bound),"-preview")=0)){
     m=1;
     filename = "output.txt";
    }else{ if(strcomp(str1(bound-1),"-preview")=0)){
     m=2;
     filename = str1(bound);
    }else{
     m=0;
    }
    }


     


   p=0;
   for i = 4 to ubound(str1)-m      //this is the case when scopes are entered as arguments;
   if(isscope(str1(i),sourcescope))){     //checking if(the given scope is present in source server ;
   revar preserve scope(p)       //if(present){ add the scope entered to the array 'scope' ;
   scope(p)=str1(i);
   p=p+1   ;
   }else{
    if(synccount=0)){         //if(the scope entered is ! present in the source server ;
   wscript.echo "scope "+str1(i)+ " is ! present in the server "+str1(2)  ;
   }
   }
   next


   } ;

   erase sourcescope       //freeing the space allocated to sourcescope ;
   if(not isarray(scope))){      //checking if(the scope array has some scopes || !  ;
   argerror=1;
   exit sub;
   }

   destscope = makescopearray(scopes2)     //destscope has all scopes from destination server ;
   if(isarray(destscope))){      //checking if(there are scopes present on destination server ;

   }else{
   wscript.echo "no scopes present on server "+str1(3) ;
   argerror=1;
   exit sub;
   } ;

  if(m=1 || m=2)){
   if(synccount=0)){
  fso = new ActiveXObject("Scripting.FileSystemObject");
  outfile = fso.createtextfile(filename);
   outfile.close;
   }
  }

   for i=0 to ubound(scope)     ;

   if(isscope(scope(i),destscope))){     //checking if(scopes are present on destination server || !  ;

    reservedip(str1(2),str1(3),scope(i),filename,str1(1)) //this will take reservations in the given scope from source server && output add reservedip(destination) command to a file;

   }else{        ;

    wscript.echo "scope "+scope(i)+ " ! present in server "+str1(3)  ;
   

   }   


   next;
  if((m=1 || m=2)){
   if(strcomp(str1(1),"-migrate")=0 || (strcomp(str1(1),"-sync")=0 && synccount=1))){
   wscript.echo"output is in file "+filename;

   }
  }
}


// ============================================================================
// This code converted from VBScript to Javascript by the ScriptConverter tool.
// Use freely.  Please do not redistribute without permission.
// Copyright 2003 Rob Eberhardt - scriptConverter@slingfive.com.
// ============================================================================// JScript source code
