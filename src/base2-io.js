/*
  base2 - copyright 2007-2009, Dean Edwards
  http://code.google.com/p/base2/
  http://www.opensource.org/licenses/mit-license.php

  Contributors:
    Doeke Zanstra
*/

// timestamp: Mon, 30 Mar 2009 18:26:18

new function(_no_shrink_) { ///////////////  BEGIN: CLOSURE  ///////////////

// =========================================================================
// io/package.js
// =========================================================================

var io = new base2.Package(this, {
  name:    "io",
  version: base2.version,
  imports: "Enumerable,Function2",
  exports: "NOT_SUPPORTED,READ,WRITE,FileSystem,Directory,LocalFileSystem,LocalDirectory,LocalFile"
});

eval(this.imports);

var NOT_SUPPORTED = function() {
  throw new Error("Not supported.");
};

var READ = 1, WRITE = 2;

var _RELATIVE       = /\/[^\/]+\/\.\./,
    _TRIM_PATH      = /[^\/]+$/,
    _SLASH          = /\//g,
    _BACKSLASH      = /\\/g,
    _LEADING_SLASH  = /^\//,
    _TRAILING_SLASH = /\/$/;

var _INVALID_MODE = function() {
  throw new Error("Invalid file open mode.");
};

var _win_formatter = {
  fromNativePath: function(path) {
    return "/" + String(path).replace(_BACKSLASH, "/");
  },

  toNativePath: function(path) {
    return String(path).replace(_LEADING_SLASH, "").replace(_SLASH, "\\");
  }
};

function _makeNativeAbsolutePath(path) {
  return LocalFileSystem.toNativePath(FileSystem.resolve(LocalFileSystem.getPath(), path));
};

var _fso; // file system object
function _activex_exec(method, path1, path2, flags) {
  if (!_fso) _fso = new ActiveXObject("Scripting.FileSystemObject");
  path1 = _makeNativeAbsolutePath(path1);
  if (arguments.length > 2) {
    path2 = _makeNativeAbsolutePath(path2);
  }
  switch (arguments.length) {
    case 2: return _fso[method](path1);
    case 3: return _fso[method](path1, path2);
    case 4: return _fso[method](path1, path2, flags);
  }
  return undefined; // prevent strict warnings
};

function _xpcom_createFile(path) {
  var file = XPCOM.createObject("file/local;1", "nsILocalFile");
  file.initWithPath(_makeNativeAbsolutePath(path));
  return file;
};

function _java_createFile(path) {
  return new java.io.File(_makeNativeAbsolutePath(path));
};

// =========================================================================
// utils/XPCOM.js
// =========================================================================

// some useful methods for dealing with XPCOM

var XPCOM = Module.extend({
  privelegedMethod: I, // no such thing as priveleged for non-Mozilla browsers
  privelegedObject: I,
  
  "@(Components)": {
    createObject: function(classPath, interfaceId) {
      if (classPath.indexOf("@") != 0) {
        classPath = "@mozilla.org/" + classPath;
      }
      try {
        return new (new Components.Constructor(classPath, interfaceId));
      } catch (error) {
        throw new Error(format("Failed to create object '%1' (%2).", interfaceId, error.message));
      }
    },
    
    privelegedMethod: function(method) {
      return function() {
        netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
        return method.apply(this, arguments);
      };
    },
    
    privelegedObject: function(object) {
      Base.forEach (object, function(method, name) {
        if (typeof method == "function") {
          object[name] = XPCOM.privelegedMethod(method);
        }
      });
    }
  }
});

// =========================================================================
// io/FileSystem.js
// =========================================================================

// A base class to derive file systems from.
// Here we'll define all the path management code.

var FileSystem = Base.extend({
  constructor: function(path) {
    if (path) this.chdir(path);
  },

  path: "/",

  chdir: function(path) {
    // set the current path
    assert(this.isDirectory(path), path + " is not a directory.");
    path = this.makepath(path);
    if (!_TRAILING_SLASH.test(path)) path += "/";
    this.path = path;
  },

  makepath: function(path1, path2) {
    if (arguments.length == 1) {
      path2 = path1;
      path1 = this.path;
    }
    return FileSystem.resolve(path1, path2);
  },
    
  copy: NOT_SUPPORTED,
  exists: NOT_SUPPORTED,
  isDirectory: NOT_SUPPORTED,
  isFile: NOT_SUPPORTED,
  mkdir: NOT_SUPPORTED,
  move: NOT_SUPPORTED,
  read: NOT_SUPPORTED,
  remove: NOT_SUPPORTED,
  write: NOT_SUPPORTED
}, {
  resolve: function(path1, path2) {
    // stringify
    path1 = String(path1 || "");
    path2 = String(path2 || "");
    // create a full path from two paths
    if (path2.indexOf("/") == 0) {
      var path = "";
    } else {
      path = path1.replace(_TRIM_PATH, "");
    }
    path += path2;
    // resolve relative paths
    while (_RELATIVE.test(path)) {
      path = path.replace(_RELATIVE, "");
    }
    return path;
  }
});

// =========================================================================
// io/Directory.js
// =========================================================================

// A collection of stubs that map out the directory structure.
// -- it's too expensive to create full file objects...

var Directory = Collection.extend({
  sort: function() {
    return this.base(function(file1, file2, name1, name2) {
      if (file1.isDirectory != file2.isDirectory) {
        return file1.isDirectory ? -1 : 1; 
      } else {
        return name1 < name2 ? -1 : 1; 
      }
    });
  }
}, {
  Item: {
    constructor: function(name, isDirectory, size) {
      this.name = name + "";
      this.isDirectory = !!isDirectory;
      this.size = isDirectory ? 0 : size || 0;
    },

    name : "",
    isDirectory: false,
    size: 0,
    
    toString: function() {
      return this.name;
    }
  }
});

// =========================================================================
// io/LocalFileSystem.js
// =========================================================================

var LocalFileSystem = FileSystem.extend({
  constructor: function(path) {
    this.path = LocalFileSystem.getPath();
    this.base(path);
  },

  backup: function(path, extension) {
    if (this.isFile(path)) {
      if (!extension) extension = ".backup";
      this.write(path + extension, this.read(path));
    }
  },
  
  read: function(path) {
    if (this.isDirectory(path)) {
      return new LocalDirectory(this.makepath(path));
    } else {
      var file = new LocalFile(this.makepath(path));
      file.open(READ);
      var text = file.read();
      file.close();
      return text;
    }
  },

  write: function(path, text) {
    var file = new LocalFile(this.makepath(path));
    file.open(WRITE);
    file.write(text);
    file.close();
  },

  "@(ActiveXObject)": {
    copy: function(path1, path2) {
      _activex_exec(this.isDirectory(path1) ? "CopyFolder" : "CopyFile", this.makepath(path1), this.makepath(path2), true);
    },

    exists: function(path) {
      return this.isFile(path) || this.isDirectory(path);
    },

    isFile: function(path) {
      return _activex_exec("FileExists", this.makepath(path));
    },
    
    isDirectory: function(path) {
      return _activex_exec("FolderExists", this.makepath(path));
    },
  
    mkdir: function(path) {
      _activex_exec("CreateFolder", this.makepath(path));
    },
    
    move: function(path1, path2) {
      _activex_exec(this.isDirectory(path1) ? "MoveFolder" : "MoveFile", this.makepath(path1), this.makepath(path2));
    },
    
    remove: function(path) {
      if (this.isFile(path)) {
        _activex_exec("DeleteFile", this.makepath(path));
      } else if (this.isDirectory(path)) {
        _activex_exec("DeleteFolder", this.makepath(path));
      }
    }
  },

  "@(Components)": { // XPCOM
    copy: function(path1, path2) {
      var file1 = _xpcom_createFile(this.makepath(path1));
      var file2 = _xpcom_createFile(this.makepath(path2));
      file1.copyTo(file2.parent, file2.leafName);
    },
    
    exists: function(path) {
      return _xpcom_createFile(this.makepath(path)).exists();
    },
    
    isFile: function(path) {
      var file = _xpcom_createFile(this.makepath(path));
      return file.exists() && file.isFile();
    },
    
    isDirectory: function(path) {
      var file = _xpcom_createFile(this.makepath(path));
      return file.exists() && file.isDirectory();
    },
  
    mkdir: function(path) {
      _xpcom_createFile(this.makepath(path)).create(1);
    },
    
    move: function(path1, path2) {
      var file1 = _xpcom_createFile(this.makepath(path1));
      var file2 = _xpcom_createFile(this.makepath(path2));
      file1.moveTo(file2.parent, file2.leafName);
    },
    
    remove: function(path) {
      _xpcom_createFile(this.makepath(path)).remove(false);
    }
  },

  "@(java && !global.Components)": {
    exists: function(path) {
      return _java_createFile(this.makepath(path)).exists();
    },

    isFile: function(path) {
      return _java_createFile(this.makepath(path)).isFile();
    },

    isDirectory: function(path) {
      return _java_createFile(this.makepath(path)).isDirectory();
    },

    mkdir: function(path) {
      _java_createFile(this.makepath(path)).mkdir();
    },

    move: function(path1, path2) {
      var file1 = _java_createFile(this.makepath(path1));
      var file2 = _java_createFile(this.makepath(path2));
      file1.renameTo(file2);
    },

    remove: function(path) {
      _java_createFile(this.makepath(path))["delete"]();
    }
  }
}, {
  init: function() {
    forEach.csv("copy,move", function(method) {
      extend(this, method, function(path1, path2, overwrite) {
        assert(this.exists(path1), "File does not exist: " + path1);
        if (this.exists(path2)) {
          if (overwrite) {
            this.remove(path2);
          } else {
            throw new Error("File already exists: " + path2);
          }
        }
        this.base(path1, path2);
      });
    }, this.prototype);
  },

  "@(Components)": { // XPCOM
    init: function() {
      this.base();
      XPCOM.privelegedObject(this.prototype);
    }
  },
  
  fromNativePath: I,
  toNativePath: I,

  getPath: K("/"),

  "@(global.java.io.File.separator=='\\\\')": _win_formatter,
  "@(jscript)": _win_formatter,
  "@win(32|64)": _win_formatter,
  
  "@(java)": {
    getPath: function() {
      return this.fromNativePath(new java.io.File("").getAbsolutePath());
    }
  },

  "@(ActiveXObject)": {
    getPath: function() {
      var fso = new ActiveXObject("Scripting.FileSystemObject");
      return this.fromNativePath(fso.GetFolder(".").path);
    }
  },

  "@(location)": {
    getPath: function() {
      return decodeURIComponent(location.pathname.replace(_TRIM_PATH, ""));
    }
  },

  "@(true)": {
    getPath: function() { // memoise
      var path = this.base();
      this.getPath = K(path);
      return path;
    }
  }
});

// =========================================================================
// io/LocalDirectory.js
// =========================================================================

var LocalDirectory = Directory.extend({
  "@(ActiveXObject)": {
    constructor: function(path) {
      this.base();
      if (typeof path == "string") {
        var directory = _activex_exec("GetFolder", path);
        forEach ([directory.SubFolders, directory.Files], function(list) {
          var enumerator = new Enumerator(list);
          while (!enumerator.atEnd()) {
            var file = enumerator.item();
            this.put(file.Name, file);
            enumerator.moveNext();
          }
        }, this);
      }
    }
  },

  "@(Components)": { // XPCOM
    constructor: function(path) {
      this.base();
      if (typeof path == "string") {
        var file = _xpcom_createFile(path);
        var directory = file.directoryEntries;
        var enumerator = directory.QueryInterface(Components.interfaces.nsIDirectoryEnumerator);
        while (enumerator.hasMoreElements()) {
          file = enumerator.nextFile;
          this.put(file.leafName, file);
        }
      }
    }
  },

  "@(java && !global.Components)": {
    constructor: function(path) {
      this.base();
      if (typeof path == "string") {
        var file = _java_createFile(path);
        var directory = file.list();
        for (var i = 0; i < directory.length; i++) {
          file = new java.io.File(directory[i]);
          this.put(file.getName(), file);
        }
      }
    }
  }
}, {
  "@(ActiveXObject)": {
    create: function(name, file) {
      return new this.Item(name, file.Type | 16, file.Size);
    }
  },

  "@(Components)": {
    create: function(name, file) {
      return new this.Item(name, file.isDirectory(), file.fileSize);
    }
  },

  "@(java && !global.Components)": {
    create: function(name, file) {
      return new this.Item(name, file.isDirectory(), file.length());
    }
  }
});

// =========================================================================
// io/LocalFile.js
// =========================================================================

// A class for reading/writing the local file system. Works for Moz/IE/Opera(java)
// the java version seems a bit buggy when writing...?

var LocalFile = Base.extend({
  constructor: function(path) {
    this.toString = K(FileSystem.resolve(LocalFileSystem.getPath(), path));
  },
  
  close: _INVALID_MODE,
  open: NOT_SUPPORTED,
  read: _INVALID_MODE,
  write: _INVALID_MODE,

  "@(ActiveXObject)": {
    open: function(mode) {
      var path = LocalFileSystem.toNativePath(this);
      var fso = new ActiveXObject("Scripting.FileSystemObject");
      
      switch (mode) {
        case READ:
          assert(fso.FileExists(path), "File does not exist: " + this);
          var stream = fso.OpenTextFile(path, 1);
          this.read = function() {
            return stream.ReadAll();
          };
          break;
          
        case WRITE:
          stream = fso.OpenTextFile(path, 2, -1, 0);
          this.write = function(text) {
            stream.Write(text || "");
          };
          break;
      }
      
      this.close = function() {
        stream.Close();
        delete this.read;
        delete this.write;
        delete this.close;
      };
    }
  },

  "@(Components)": { // XPCOM
    open: function(mode) {
      var file = _xpcom_createFile(this);
      
      switch (mode) {
        case READ:
          assert(file.exists(), "File does not exist: " + this);
          var input = XPCOM.createObject("network/file-input-stream;1", "nsIFileInputStream");
          input.init(file, 0x01, 00004, null);
          var stream = XPCOM.createObject("scriptableinputstream;1", "nsIScriptableInputStream");
          stream.init(input);
          this.read = function() {
            return stream.read(stream.available());
          };
          break;
          
        case WRITE:
          if (!file.exists()) file.create(0, 0664);
          stream = XPCOM.createObject("network/file-output-stream;1", "nsIFileOutputStream");
          stream.init(file, 0x20 | 0x02, 00004, null);
          this.write = function(text) {
            if (text == null) text = "";
            stream.write(text, text.length);
          };
          break;
      }
      
      this.close = function() {
        if (mode == WRITE) stream.flush();
        stream.close();
        delete this.read;
        delete this.write;
        delete this.close;
      };
    }
  },

  "@(java && !global.Components)": {
    open: function(mode) {
      var path = LocalFileSystem.toNativePath(this);
      var io = java.io;
      
      switch (mode) {
        case READ:
          var file = _java_createFile(this);
          assert(file.exists(), "File does not exist: " + this);
          var stream = new io.BufferedReader(new io.FileReader(path));
          this.read = function() {
            var lines = [], line, i = 0;
            while ((line = stream.readLine()) != null) {
              lines[i++] = line;
            }
            return lines.join("\r\n");
          };
          break;
          
        case WRITE:
          assert(!global.navigator, "Cannot write to local files with this browser.");
          stream = new io.PrintStream(new io.FileOutputStream(path));
          this.write = function(text) {
            stream.print(text || "");
          };
          break;
      }
      
      this.close = function() {
        stream.close();
        delete this.read;
        delete this.write;
        delete this.close;
      };
    }
  }
});

eval(this.exports);

}; ////////////////////  END: CLOSURE  /////////////////////////////////////
