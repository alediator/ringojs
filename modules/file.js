include('io');
include('binary');

importClass(java.io.File,
            java.io.FileInputStream,
            java.io.FileOutputStream);

export('open',
       'read',
       'write',
       'copy',
       'move',
       'remove',
       'exists',
       'isReadable',
       'isWritable',
       'isFile',
       'isDirectory',
       'size',
       'cwd',
       'chdir');

function open(path, mode, options) {
    options = checkOptions(mode, options);
    var file = new FixedFile(path);
    var {read, write, append, update, binary, charset} = options;
    if (!read && !write && !append && !update) {
        read = true;
    }
    var stream = new IOStream(read ?
            new FileInputStream(file) : new FileOutputStream(file, Boolean(append)));
    if (binary) {
        return stream;
    } else if (read) {
        return new TextInputStream(stream, charset);
    } else if (write || append) {
        return new TextOutputStream(stream, charset);
    } else if (update) {
        throw new Error("update not yet implemented");
    }
}

function read(path, options) {
    var stream = open(path, 'r', options);
    try {
        return stream.read();
    } finally {
        stream.close();
    }
}

function write(path, content, options) {
    var stream = open(path, 'w', options);
    try {
        stream.write(content);
    } finally {
        stream.close();
    }
}

function size(path) {
    var file = new FixedFile(path);
    return file.length();
}

function copy(from, to) {
    var source = new FixedFile(from);
    var target = new FixedFile(to);
    var input = new FileInputStream(source).getChannel();
    var output = new FileOutputStream(target).getChannel();
    var size = source.length();
    try {
        input.transferTo(0, size, output);
    } finally {
        input.close();
        output.close();
    }
}

function move(from, to) {
    var source = new FixedFile(from);
    var target = new FixedFile(to);
    if (!source.renameTo(target)) {
        throw new Error("Failed to move file from " + from + " to " + to);
    }
}

function remove(path) {
    var file = new FixedFile(path);
    if (!file['delete']()) {
        throw new Error("Failed to remove file " + path);
    }
}

function exists(path) {
    var file = new FixedFile(path);
    return file.exists();
}

function cwd() {
    return java.lang.System.getProperty('user.dir');
}

function chdir(path) {
    path = new File(path).getCanonicalPath();
    java.lang.System.setProperty('user.dir', path);
}

function isReadable(path) {
    return new FixedFile(path).canRead();
}

function isWritable(path) {
    return new FixedFile(path).canWrite();
}

function isFile(path) {
    return new FixedFile(path).isFile();
}

function isDirectory(path) {
    return new FixedFile(path).isDirectory();
}

var optionsMask = {
    read: 1,
    write: 1,
    append: 1,
    update: 1,
    binary: 1,
    exclusive: 1,
    canonical: 1,
    charset: 1
}

function checkOptions(mode, options) {
    if (!options) {
        options = {};
    } else if (typeof options != 'object') {
        throw new Error('object expected for options argument');
    } else {
        for (var key in options) {
            if (!(key in optionsMask)) {
                throw new Error("Unsupported option: " + key);
            }
            options[key] = key == charset ? String(options[key]) : Boolean(options[key]);
        }
    }
    if (typeof mode == 'string') {
        for (var i = 0; i < mode.length; i++) {
            switch (mode[i]) {
            case 'r':
                options.read = true;
                break;
            case 'w':
                options.write = true;
                break;
            case 'a':
                options.append = true;
                break;
            case '+':
                options.update = true;
                break;
            case 'b':
                options.binary = true;
                break;
            case 'x':
                options.exclusive = true;
                break;
            case 'c':
                options.canonical = true;
                break;
            default:
                throw new Error("Unsupported mode argument: " + options);
            }
        }
    }
    return options;
}

function FixedFile(path) {
    // Fix: relative files are not resolved against cwd/user.dir in java
    // http://bugs.sun.com/bugdatabase/view_bug.do?bug_id=4117557
    if (path == undefined) {
        throw new Error('undefined path argument');
    }
    var file = new File(String(path));
    return file.isAbsolute() ? file : file.getAbsoluteFile();
}