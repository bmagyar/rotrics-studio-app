# Build the Rotrics Studio App from scratch

## 1. Installation and configuration
Install java, python2.7, node (>=14.1.0)
Configure environment variables: python, java
Configure cnpm: https://developer.aliyun.com/mirror/NPM?from=tnpm
Install git bash (mac does not need to be installed; windows needs to use linux terminal; git bash is easier to use)

Both serialport and rotrics-scratch-blocks need to use python2.7
Install the latest visual studio (to select the professional version) (required when compiling serialport)
Pay attention when installing, be sure to select "Desktop development with C++", in the workload option
Otherwise, an error will be reported: "Visual Studio C++ core feature" missing
  
## 2.clone code and install dependencies
```bash
# clone repository, all three repositories must be placed in the same folder (affecting copy_files.js script execution)
git clone https://github.com/Rotrics-Dev/rotrics-studio-app.git
git clone https://github.com/Rotrics-Dev/rotrics-scratch-vm.git
git clone https://github.com/Rotrics-Dev/rotrics-scratch-blocks.git

# npm is too slow, recommend cnpm
cd rotrics-scratch-vm
cnpm install
npm link

cd rotrics-scratch-blocks
cnpm install
npm link

cd rotrics-studio-app/server
cnpm install

cd rotrics-studio-app/web
cnpm install

cd rotrics-studio-app/electron
#electron is used for packaging, special, and needs to be installed with npm; cnpm and npm are not the same;
#After using cnpm to install, the packaged software opens very slowly; wait patiently, it may take half an hour
npm install
#Recompile the native module (currently only serialport is used), to ensure that it corresponds to the electron node version;
#Be patient, it may take half an hour
npm run rebuild
```

## 3. Others
Compile rotrics-scratch-blocks:
for mac: npm run prepublish-mac
for win: npm run prepublish-win

copy files
cd rotrics-studio-app/web
Create a new folder: build-web, and copy web/index.html to build-web

## 4. Run in the development environment
```bash
cd rotrics-studio-app/server
npm start

cd rotrics-studio-app/web
npm start
##If everything is normal, you can see that the page is displayed normally: http://localhost:8080/
```

## 5. Run in Electron environment
```bash
cd rotrics-studio-app/server
npm run build

cd rotrics-studio-app/web
npm run build

cd rotrics-studio-app/electron
npm start
# If it prompts that the serialport version does not correspond to the electron node version, please execute: npm run rebuild
```

## 6. Electron packaging
```bash
cd rotrics-studio-app/electron
#for mac:
#Must be on a mac computer
npm run build:mac-x64

#for win:
#Must be on a windows computer
npm run build:win-x64
```

# Brief description of the project structure
Including three sub-projects, all of which are node projects
### web
Front-end part, get "index.html+js+resources" after build, execute loadFile(index.html) when electron is running
### server
local server, providing http api and socket connection to the web side, and then accessing the native layer
### electron
When running on the web, the local server uses the specified address: http://localhost:9000
When electron is running, dynamically obtain the port and hang the local server address under the window
It is convenient to obtain on the web side, never establish socket connect and use http api
When electron executes main.js, start the local server first, and then load the index.html obtained from the web-side build after success

## Precautions
node: >=14.1.0
electron: >=9.0.0
serialport: >=9.0.0

If it prompts that the serialport version does not correspond to the electron node version, please execute: npm run rebuild
The serialport that electron relies on must correspond to the electron node version, so rebuild is required
The dependencies in package.json of electron and server need to be consistent
Under electron, you must use npm instead of cnpm to install node_modules

Make sure that the contents of the two files are consistent: server/src/constants.js and web/src/constants.js