' VBScript source code
call start()
dim scopes
dim synccount
dim argerror
dim iparray
dim macarray
dim finaliparray
dim finalmacarray
dim m
dim args

sub start()
 
 args=0 
 synccount=0
 argerror=0
 if(wscript.arguments.count=0) then
 wscript.echo "enter the command"
 exit sub
 end if

 for i=0 to wscript.arguments.count-1
 if(i=0) then
 str=wscript.arguments.item(i)
 else
 str=str&" "&wscript.arguments.item(i)
 end if 
 next
 
 str1=split(str)

 'show error if nothing is entered------------

 if (not isarray(str1)) then
 wscript.echo "Error: unrecongnized or incomplete command line."
 call helpfile()
 exit sub
 end if


 'checking if the command is Rmanager or not

 if(strcomp("Rmanager",str1(0))<>0) then
 wscript.echo "Error: unrecongnized or incomplete command line."
 call helpfile()
 exit sub
 end if
  
 'checking for different cases after Rmanager
 if(ubound(str1)=0) then
 wscript.echo "Error: unrecongnized or incomplete command line."
 call helpfile()
 exit sub
 end if
 select case str1(1)

 case "-migrate"

  call migrate(str1)
  
 case "-sync"
  
  call migrate(str1)
  if(argerror=1) then
  exit sub
  end if
  synccount=1
  a=str1(2)
  str1(2)=str1(3)
  str1(3)=a
  call migrate(str1) 

 case "-dumplease"
  
  call dump(str1)
  
 case "-makereservation"

  call makereservation(str1)
 
 case "/?"
 
  call helpfile()
  
 case else
  wscript.echo "Error: unrecongnized or incomplete command line."
  call helpfile()
 
  end select
 
'delete the scopefile that is created during the program 

set fso = createobject("Scripting.FileSystemObject")
if(fso.fileexists("scopefile.txt"))then
fso.deletefile("scopefile.txt"),true
end if


end sub


' function for dumplease

sub dump(str1)

'if improper arguments are entered show error

if ubound(str1)<4 then       
wscript.echo "Error: unrecongnized or incomplete command line."
call helpfile()
exit sub
end if

filename = str1(2)
set fso = createobject("Scripting.FileSystemObject")
 Set outfile = fso.CreateTextFile(filename)
 outfile.close

p=checkserver(str1(3))

if p=0 then
wscript.echo "server "&str1(3)&" not present or is entered wrongly"
exit sub
end if

serverarray = makescopearray(scopes)

if not isarray(serverarray) then
wscript.echo "no scopes in server "&str1(3)
exit sub
end if

if (strcomp(str1(4),"all")=0) then

 if(ubound(str1)=4) then
 scope = serverarray
 else
 wscript.echo "improper arguments"
 end if

else

for i = 4 to ubound(str1)
if(isscope(str1(i),serverarray)) then
redim preserve scope(i-4)
scope(i-4)=str1(i)
else
wscript.echo "scope "& str1(i) &" is not present in server "&str1(3)
exit sub
end if
next
end if
'scope contains all the scopes entered
if not isarray(scope) then
wscript.echo "no scopes in the server "&str1(3)
else
if scope(0)="" then
wscript.echo "no scopes in the server "&str1(3)
else
 set wshell = CreateObject("WScript.Shell")
 
 for i = 0 to ubound(scope)
 set obj = wshell.exec("netsh dhcp server "&str1(3)&" scope "&scope(i)&" show clients")
 clients = obj.stdout.readall()
 if(instrrev(clients,"Command completed successfully.")=0) then
 exit sub
 end if 
 call makeclients(clients,str1(2)) 
 next
end if
end if
if args = 0 then
else
wscript.echo "the ipaddress and macaddress pair are in file "&filename
end if
end sub

'the following procedure outputs the ip and corresponding mac addresses(active leases) into the file - 'filename'...it takes the output string clients that we get after executing the command shoe clients

sub makeclients(clients,filename)

 set fso = createobject("Scripting.FileSystemObject")
 Set scopefile = fso.CreateTextFile("scopefile.txt")
 scopefile.writeline(clients)
 scopefile.close
 
 
 Set scopefile = fso.OpenTextFile("scopefile.txt")
   do While not scopefile.AtEndOfStream   'reading line by line and checking for the string "Total No. of Scopes"
    
    line = scopefile.ReadLine
   
   if(instr(line,"No of Clients")=1) then  
   str = split(line)
   
   t=str(4)        'taking no. of clients into t
   exit do
   
   end if

   loop   

   scopefile.close
   
   t=cint(t)    

   if t=0 then
   wscript.echo "no clients in the scope "&str(ubound(str))
   
   exit sub
   end if
args=args+1
Set scopefile = fso.OpenTextFile("scopefile.txt")
for i= 1 to 8
scopefile.skipline
next     

set outfile = fso.opentextfile(filename,8)

for i=0 to t-1
line=scopefile.readline

str= split(line)

if (instr(line,"INACTIVE")<>0) then
d=0
 for l=0 to ubound(str)
 if(str(l)="") then
 else
 if d=3 then
 exit for
 else
 d=d+1 
 end if
 end if
 next
 
outfile.write(str(0))
for size = 1 to 18-(len(str(0)))
outfile.write(" ")
next

outfile.writeline(trim(replace(str(l),"-","")))

else
d=0
 for l=0 to ubound(str)
 if(str(l)="") then
 else
 if d=4 then
 exit for
 else
 d=d+1 
 end if
 end if
 next
outfile.write(str(0))
for size = 1 to 18-(len(str(0)))
outfile.write(" ")
next

outfile.writeline(trim(replace(str(l),"-","")))


end if
next
outfile.close
end sub

sub makereservation(str1)

if ubound(str1)<>3 then
wscript.echo "Error: unrecongnized or incomplete command line."
call helpfile()
exit sub
end if

server = str1(2)
filename = str1(3)

set fso = createobject("Scripting.FileSystemObject")
if(not fso.fileexists(filename))then
wscript.echo "file "&filename&" not present"
exit sub
end if

k = checkserver(server)
if k=0 then
wscript.echo "server "&server&" is not present or may have been entered wrongly"
exit sub
end if

scopearray=makescopearray(scopes)       'scopes is the output string obtained after executing show scope command for given server

set handle = fso.opentextfile(filename)

Dim ipaddress
Dim macaddress
t=0
do while not handle.atendofstream

 line=trim(handle.readline)
 line=replace(line," ","") 
 if line="" then
 
 else
  strarray=split(line)

  p=0

  for k=0 to ubound(strarray)
   if strarray(k)="" then
      
   else

    if p=0 then 
    ipaddress=trim(strarray(k))
    else if p=1 then
    macaddress = trim(strarray(k))
    end if
    end if
    p=p+1
    'wscript.echo Replace(ipaddress, " ", "")
    'wscript.echo macaddress
   end if
  next
  
  if p<>2 then
  wscript.echo "improper format of file"
  exit sub
  end if
 
 redim preserve iparray3(t)
 redim preserve macarray3(t)
 iparray3(t)=ipaddress
 macarray3(t)=macaddress
 t=t+1
 end if
 

loop
handle.close

if not isarray(iparray3) then
wscript.echo "there is nothing in the file"
exit sub
end if

dim arr
redim arr(t-1)
 
for i = 0 to ubound(scopearray)
 
set iprange = fso.createtextfile("iprangefile.txt")
iprange.close
arraysize = 0
dim iparray1
redim iparray1(0)
redim macarray1(0)

  set wshell = CreateObject("WScript.Shell")
 set obj = wshell.exec("netsh dhcp server "&server&" scope "&scopearray(i)&" show iprange")
 range = obj.stdout.readall()
 
 set iprange = fso.opentextfile("iprangefile.txt",8)
 iprange.writeline(range)
 iprange.close
 set iprange = fso.opentextfile("iprangefile.txt")
 
 for p=0 to 5
 iprange.skipline
 next
 line1=iprange.readline
 line2=split(line1)
 
 count=0
 
 for j=0 to t-1
 
 k = checkiprange(line2(3),line2(13),iparray3(j))
 
 if k = 1 then
 
 redim preserve iparray1(arraysize)
 redim preserve macarray1(arraysize)
 iparray1(arraysize) = iparray3(j)
 macarray1(arraysize) = macarray3(j) 
 arraysize = arraysize + 1
 arr(j)=1
 else if k=2 then
 wscript.echo "the ip address "&iparray3(j)&" is not valid" 
 fso.deletefile("iprangefile.txt"),true
 exit sub
 end if 
 end if
 next 

iprange.close


if isarray(iparray1) and not iparray1(0)="" then

call addreservation(server,scopearray(i),iparray1,macarray1) 

if (finaliparray(0)="") then

else
for l=0 to ubound(finaliparray)
set obj = wshell.exec("netsh dhcp server "&server&" scope " &scopearray(i)& " add reservedip "&finaliparray(l)&" "&finalmacarray(l) )
outp =  obj.stdout.readall()
  if(instr(outp,"Command completed successfully.")<>0) then
  wscript.echo "added reservation "&finaliparray(l)& " "&finalmacarray(l)&" to server "&server&" in scope "&scopearray(i)
  else
  
  wscript.echo "The specified IP address "&finaliparray(l)& " or hardware address "& finalmacarray(l)& " is either not proper or is being used by another client."
  end if
next
end if

end if
redim iparray1(0)
redim macarray1(0)

next

set handle = fso.opentextfile(filename)
for i=0 to ubound(arr)
str=trim(handle.readline)

if(arr(i)=0) then
line=split(str)

wscript.echo "The ipaddress "&iparray3(i)&" is not present in any scope"
end if
next
handle.close
fso.deletefile("iprangefile.txt"),true
end sub

sub addreservation(server,scopestr,iparraysource,macarraysource)

 redim finaliparray(0)
 redim finalmacarray(0)
 set wshell = CreateObject("WScript.Shell")
 set obj = wshell.exec("netsh dhcp server "&server&" scope " &scopestr& " show reservedip" )
 outpdest = obj.stdout.readall()

 call makeipandmacarray(outpdest)
 iparraydest = iparray
 macarraydest = macarray   
 
 ' remove common ip and mac pair between the two servers for the given scope
 
 if(not isarray(iparraydest)) then
  finaliparray=iparraysource 
  finalmacarray=macarraysource 
 
 else
  k=0
  
  for i = 0 to ubound(iparraysource)
  flag=0
   for j=0 to ubound(iparraydest)
    if(iparraysource(i)=iparraydest(j) and macarraysource(i)=macarraydest(j)) then
    flag=1
    exit for
    end if
   next
  
  if flag=1 then
  
   if synccount = 0 and m=0 then
  
  wscript.echo "reservation "&iparraysource(i)&" "&macarraysource(i)&" is already present on server "&server
   end if
  else
  
  redim preserve finaliparray(k) 
  redim preserve finalmacarray(k)
  finaliparray(k)=iparraysource(i)
  finalmacarray(k)=macarraysource(i) 
  k=k+1   
  end if
  next
 end if

end sub

function checkiprange(ip1,ip2,ip3)

str2=split(ip1,".")
str3=split(ip2,".")
str4=split(ip3,".")
if ubound(str4)<>3 then
checkiprange=2
exit function
end if

dim string

if cint(str2(0))<=cint(str4(0)) and cint(str4(0))<=cint(str3(0)) then
 if cint(str2(1))<=cint(str4(1)) and cint(str4(1))<=cint(str3(1)) then
  for i=2 to 3
if(cint(str2(i))>=0 and cint(str2(i))<10) then
string1=string1&"00"&str2(i)
else if(cint(str2(i))>=10 and cint(str2(i))<100) then
string1=string1&"0"&str2(i)
end if
end if
next
for i=2 to 3
if(cint(str3(i))>=0 and cint(str3(i))<10) then
string2=string2&"00"&str3(i)
else if(cint(str3(i))>=10 and cint(str3(i))<100) then
string2=string2&"0"&str3(i)
end if
end if
next


for i=2 to 3
if(cint(str4(i))>=0 and cint(str4(i))<10) then
string3=string3&"00"&str4(i)
else if(cint(str4(i))>=10 and cint(str4(i))<100) then
string3=string3&"0"&str4(i)
end if
end if
next

if(cint(string1)<=cint(string3) and cint(string3)<=cint(string2)) then
checkiprange=1
else
checkiprange=0
end if

 else
 checkiprange=0
 end if
else
checkiprange=0
end if
end function

sub helpfile()

set fso = createobject("Scripting.FileSystemObject")
set help = fso.OpenTextFile("help.txt")

do while not help.atendofstream

wscript.echo (help.readline)

loop

end sub

' this function will return 1 if the scope(scopestr) is present in the given server(serverarray....this is an array of server scopes)(be it source or destination)...else 0

function isscope(scopestr,serverarray)

l=0
for i=0 to ubound(serverarray)
if(strcomp(scopestr,serverarray(i))=0) then
l=1
exit for
end if
next

isscope=l

end function

'this function will check if the server entered as argument is present or not(or rather entered correctly or not)

function checkserver(str1)
dim wshell

dim pos1

 set wshell = CreateObject("WScript.Shell")
 set obj = wshell.exec("netsh dhcp server "&str1&" show scope")
    
 scopes = obj.stdout.readall()
 
 pos1=instr(scopes,"Command completed successfully.")      'if the string is present, the command has executed succesfully
 
 if(pos1<>0) then
  checkserver=1
 else
  checkserver=0
 end if
  
end function


  


'this function takes as argument the output string that we get after the command show scope is executed and returns
'the array of all scopes present in the server

function makescopearray(scopes)

   set fso = createobject("Scripting.FileSystemObject")
   Set scopefile = fso.CreateTextFile("scopefile.txt")
   scopefile.writeline(scopes)           'writing output string to a file
   scopefile.close
       
   Set scopefile = fso.OpenTextFile("scopefile.txt")
   do While not scopefile.AtEndOfStream   'reading line by line and checking for the string "Total No. of Scopes"
    
    line = scopefile.ReadLine
   
   if(instr(line,"Total No. of Scopes")=2) then  
   str = split(line)
   t=str(ubound(str)-1)        'taking no. of scopes into t
   exit do
   end if

   loop   

   scopefile.close
   
   t=cint(t)      'converting string to integer
    
   if t=0 then      'if no scopes are present
   
   makescopearray=""     
   else
      
   Set scopefile = fso.OpenTextFile("scopefile.txt")    
   for i=1 to 5
   scopefile.skipline     'skipping first five lines
   next    
   for i=0 to t-1
   str3=trim(scopefile.readline)
   
   str3 = split(str3," ")
       
   redim preserve serverscope(i)
   serverscope(i)=str3(0)     'adding scopes to array serverscope
   
   next
   makescopearray = serverscope    'returning the array to calling function
   scopefile.close
   end if
end function

 

'function to take reservations from source server and add to destination server for a given scope

sub reservedip(sourceadd,destadd,scopestr,filename,command)

 dim outp
 set wshell = CreateObject("WScript.Shell")
 set obj = wshell.exec("netsh dhcp server "&sourceadd&" scope " &scopestr& " show reservedip" )
 outpsource = obj.stdout.readall()

 call makeipandmacarray(outpsource)
 iparraysource = iparray
 macarraysource = macarray
 
 if(not isarray(iparraysource)) then
 wscript.echo "no reservations in the scope "&scopestr&" on the server "&sourceadd
  exit sub
 end if
 

 if(m=1 or m=2) then

 set fso = createobject("Scripting.FileSystemObject")
 Set outfile = fso.openTextFile(filename,8)

 for i=0 to ubound(iparraysource)  
 outfile.writeline("netsh dhcp server "&destadd& " scope " &scopestr& " add reservedip " &iparraysource(i)& " " & macarraysource(i))
 next
 outfile.close
 exit sub
 end if


call addreservation(destadd,scopestr,iparraysource,macarraysource)

'now finaliparray and finalmacarray contain only the unique ip and mac addresses

if (not isarray(finaliparray) or finaliparray(0)="") then
if ((m=1 or m=2)) then
  if (strcomp(command,"-migrate")=0 or (strcomp(command,"-sync")=0 and synccount=1)) then
  wscript.echo"output is in file "&filename
  end if 
 end if

 exit sub
 end if

t=ubound(finaliparray)
  
  set wshell = CreateObject("WScript.Shell")
  for i=0 to t
  set obj = wshell.exec("netsh dhcp server "&destadd&" scope " &scopestr& " add reservedip " &finaliparray(i)& " " & finalmacarray(i))
  outp =  obj.stdout.readall()
  if(instr(outp,"Command completed successfully.")) then
  wscript.echo "added reservation "&finaliparray(i)& " "&finalmacarray(i)&" to server "&destadd&" in scope "&trim(scopestr)
  else
  
  wscript.echo "The specified IP address "&finaliparray(i)& " or hardware address "& finalmacarray(i)& " is being used by another client."
  end if
  
  next
 
 if ((m=1 or m=2)) then
  if (strcomp(command,"-migrate")=0 or (strcomp(command,"-sync")=0 and synccount=1)) then
  wscript.echo"output is in file "&filename
  end if 
 end if
end sub

sub makeipandmacarray(outp)


 redim iparray(0)
 redim macarray(0)

 set fso = createobject("Scripting.FileSystemObject")
 Set scopefile = fso.CreateTextFile("scopefile.txt")
 scopefile.writeline(outp)
 scopefile.close
  
 Set scopefile = fso.openTextFile("scopefile.txt")
  
 
 do While not scopefile.AtEndOfStream
 line = scopefile.ReadLine
 if(instr(line,"No of ReservedIPs")=1) then
 str = split(line)
 t=str(4)         'taking no. of reservations into t
 exit do
 end if
 loop   
 
 scopefile.close
 
 if t=0 then
 iparray = ""
 macarray = ""
 exit sub
 
 else
 Set scopefile = fso.openTextFile("scopefile.txt")
 
 for i=1 to 7
 scopefile.skipline
 next
 
 for i=1 to t
 redim preserve iparray(i-1)
 redim preserve macarray(i-1)
 string1=split(trim(scopefile.readline))
 
 iparray(i-1)=string1(0)
 macarray(i-1)=replace(string1(ubound(string1)),"-","")
 next
 end if
 scopefile.close
 
end sub

sub migrate(str1)

  if ubound(str1)<4 then        ' ensures that the command entered has required no. of arguments 
         wscript.echo "Error: unrecongnized or incomplete command line."
  call helpfile()
  argerror=1
  exit sub
  end if
  dim k     

  k = checkserver(str1(2))               'checking if the source server exists or not...
              'or if they are entered correct or not
  if k=0 then
  wscript.echo "server "&str1(2)& " not present or is entered wrongly"
  argerror=1
  exit sub
  end if
  
  scopes1 = scopes
  
  k = checkserver(str1(3))   
  if k=0 then
  wscript.echo "server "&str1(3)& " not present or is entered wrongly"
  argerror=1
  exit sub
  end if

  scopes2 = scopes   
  
'comes here if both servers are entered correctly
     
   sourcescope = makescopearray(scopes1)      'sourcescope here has all scopes from source server
   if(isarray(sourcescope)) then     'checking if there are any scopes in source server  
   else
   wscript.echo "no scopes present on server "&str1(2) 
   argerror=1
   exit sub
   end if  
  
   bound=ubound(str1)
   if(strcomp(str1(4),"all")=0) then           'checking if the option "all" is entered
    if(bound>4 and bound<7) then
     if(strcomp(str1(5),"-preview")<>0) then
      argerror=1
      wscript.echo "Error: unrecongnized or incomplete command line."
      call helpfile()
      exit sub
     else
      if(bound=6) then
      filename = str1(6)
      m=2
      else
      m=1
      filename = "output.txt"
      end if
     end if
    else
     m=0
    end if
        
    scope=sourcescope       'scope array now contains all the scopes from source server 
    

   else
   
    if(strcomp(str1(bound),"-preview")=0) then
     m=1
     filename = "output.txt"
    else if(strcomp(str1(bound-1),"-preview")=0) then
     m=2
     filename = str1(bound)
    else
     m=0
    end if
    end if

    
     


   p=0
   for i = 4 to ubound(str1)-m      'this is the case when scopes are entered as arguments
   if(isscope(str1(i),sourcescope)) then     'checking if the given scope is present in source server 
   redim preserve scope(p)       'if present then add the scope entered to the array 'scope' 
   scope(p)=str1(i)
   p=p+1   
   else
    if(synccount=0) then         'if the scope entered is not present in the source server 
   wscript.echo "scope "&str1(i)& " is not present in the server "&str1(2)  
   end if
   end if
   next


   end if 
   
   erase sourcescope       'freeing the space allocated to sourcescope 
   if(not isarray(scope)) then      'checking if the scope array has some scopes or not  
   argerror=1
   exit sub
   end if
    
   destscope = makescopearray(scopes2)     'destscope has all scopes from destination server 
   if(isarray(destscope)) then      'checking if there are scopes present on destination server 
   
   else
   wscript.echo "no scopes present on server "&str1(3) 
   argerror=1
   exit sub
   end if 
   
  if(m=1 or m=2) then
   if(synccount=0) then
   set fso = createobject("Scripting.FileSystemObject")
   set outfile = fso.createtextfile(filename)
   outfile.close
   end if
  end if

   for i=0 to ubound(scope)     
   
   if(isscope(scope(i),destscope)) then     'checking if scopes are present on destination server or not  
   
    call reservedip(str1(2),str1(3),scope(i),filename,str1(1)) 'this will take reservations in the given scope from source server and output add reservedip(destination) command to a file
   
   else        
   
    wscript.echo "scope "&scope(i)& " not present in server "&str1(3)  
   

   end if   


   next
  if (m=1 or m=2) then
   if(strcomp(str1(1),"-migrate")=0 or (strcomp(str1(1),"-sync")=0 and synccount=1)) then
   wscript.echo"output is in file "&filename
 
   end if
  end if
end sub
