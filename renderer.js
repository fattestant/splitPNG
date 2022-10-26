const dropWrapper = document.getElementById("drop_file");
const canvas = document.getElementById("image_viewer");
const tips = document.getElementById("tips");
const canvasContext = canvas.getContext("2d");

let isProcessing = false;

function drawImage(path) {
    let image = new Image();
    image.onload = function() {
        canvas.width = image.width;
        canvas.height = image.height;
        canvasContext.drawImage(image, 0, 0);
        canvasContext.beginPath();
        splitImages(path);
    };
    image.onerror = function() {
        console.error("image onerror");
    };
    image.src = path;
}

dropWrapper.addEventListener("drop", (event) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
        let imagePath = files[0].path;
        if (imagePath.length > 0) {
            if (!isProcessing) {
                isProcessing = true;
                tips.innerHTML = "正在处理中";
                canvasContext.clearRect(0, 0, canvas.width, canvas.height);
                drawImage(imagePath);
            }
        }
    }
});

dropWrapper.addEventListener("dragover", (event) => {
    event.preventDefault();
})

class IteratePixels {
    #currentX;
    #currentY;
    #beginX;
    #beginY;
    #width;
    #height;

    constructor(x, y, w, h) {
        this.#currentX = x;
        this.#currentY = y;
        this.#beginX = x;
        this.#beginY = y;
        this.#width = w;
        this.#height = h;
    }

    #setCurrentX(value) {
        this.#currentX = value;
        if (this.#currentX >= (this.#beginX + this.#width)) {
            this.#currentX = this.#beginX;
            this.#currentY++;
        }
    }

    #isInIgoreArea(ignoreArea) {
        for (let i = 0; i < ignoreArea.length; i++) {
            if (this.#currentX >= ignoreArea[i].x && this.#currentX < (ignoreArea[i].x + ignoreArea[i].w) &&
                this.#currentY >= ignoreArea[i].y && this.#currentY < (ignoreArea[i].y + ignoreArea[i].h)) {
                this.#setCurrentX(ignoreArea[i].x + ignoreArea[i].w);
                return true;
            }
        }
        return false;
    }
    
    stepNextPixel(ignoreArea) {
        this.#setCurrentX(this.#currentX + 1);
        if (ignoreArea !== undefined) {
            while (this.#isInIgoreArea(ignoreArea)) { }
        }
    }

    getCurrentInfo () {
        if (this.#currentY < (this.#beginY + this.#height)) {
            let imageData = canvasContext.getImageData(this.#currentX, this.#currentY, 1, 1);
            let alpha = imageData.data[3];
            if (alpha == 0) {
                return { isTransparent: true };
            } else {
                return { isTransparent: false, x: this.#currentX, y: this.#currentY };
            }
        } else {
            return { isOver: true };
        }
    }
}

function splitImages(path) {
    let children = [];
    let iterate = new IteratePixels(0, 0, canvas.width, canvas.height);
    while (true) {
        let info = iterate.getCurrentInfo();
        if (info.isOver) {
            break;
        } else if (!info.isTransparent) {
            children.push(findChild(info.x, info.y));
        }
        iterate.stepNextPixel(children);
    }

    let canvasClone = canvas.cloneNode();
    let canvasCloneContext = canvasClone.getContext("2d");
    for (let i = 0; i < children.length; i++) {
        canvasCloneContext.clearRect(0, 0, canvas.width, canvas.height);
        let childImageData = canvasContext.getImageData(children[i].x, children[i].y, children[i].w, children[i].h);
        canvasClone.width = children[i].w;
        canvasClone.height = children[i].h;
        canvasCloneContext.putImageData(childImageData, 0, 0);
        let fileData = canvasClone.toDataURL().replace(/^data:image\/png;base64,/, "");
        window.electron.saveFile({ path: path + "_split/", name: i+".png", data: fileData });
    }
    tips.innerHTML = "拖入PNG图片";
    isProcessing = false;
    window.electron.openFolder(path + "_split");
}

class ExpandPixels {
    #left;
    #right;
    #top;
    #bottom;

    constructor(x, y) {
        this.#setBoundry(x, y);
    }

    #setLeft(value) {
        this.#left = value - 1;
        if (this.#left < -1) {
            this.#left = -1;
        }
    }

    #setRight(value) {
        this.#right = value + 1;
        if (this.#right > canvas.width) {
            this.#right = canvas.width;
        }
    }

    #setTop(value) {
        this.#top = value - 1;
        if (this.#top < -1) {
            this.#top = -1;
        }
    }

    #setBottom(value) {
        this.#bottom = value + 1;
        if (this.#bottom > canvas.height) {
            this.#bottom = canvas.height;
        }
    }

    #setBoundry(x, y) {
        if (this.#left === undefined) {
            this.#setLeft(x);
        } else {
            if (this.#left >= x) {
                this.#setLeft(x);
            }
        }

        if (this.#right === undefined) {
            this.#setRight(x);
        } else {
            if (this.#right <= x) {
                this.#setRight(x);
            }
        }

        if (this.#top === undefined) {
            this.#setTop(y);
        } else {
            if (this.#top >= y) {
                this.#setTop(y);
            }
        }

        if (this.#bottom === undefined) {
            this.#setBottom(y);
        } else {
            if (this.#bottom <= y) {
                this.#setBottom(y);
            }
        }
    }

    #detectPixel(x, y, w, h) {
        let iterate = new IteratePixels(x, y, w, h);
        while (true) {
            let info = iterate.getCurrentInfo();
            if (info.isOver) {
                return null;
            } else if (info.isTransparent) {
                iterate.stepNextPixel();
            } else {
                return { x: info.x, y: info.y };
            }
        }
    }

    expandBoundary() {
        let point = null;
        do {
            if (this.#left >= 0) {
                point = this.#detectPixel(this.#left, this.#top, 1, this.#bottom - this.#top + 1);
                if (point) break;
            }
            if (this.#right <= canvas.width) {
                point = this.#detectPixel(this.#right, this.#top, 1, this.#bottom - this.#top + 1);
                if (point) break;
            }
            if (this.#top >= 0) {
                point = this.#detectPixel(this.#left, this.#top, this.#right - this.#left + 1, 1);
                if (point) break;
            }
            if (this.#bottom <= canvas.height) {
                point = this.#detectPixel(this.#left, this.#bottom, this.#right - this.#left + 1, 1);
                if (point) break;
            }
        } while (false);
        
        if (point !== null) {
            this.#setBoundry(point.x, point.y);
            return true;
        } else {
            return false;
        }
    }

    getPixelsInfo() {
        return { x: this.#left + 1, y: this.#top + 1, w: this.#right - this.#left - 1, h: this.#bottom - this.#top - 1};
    }
}

function findChild(x, y) {
    let expand = new ExpandPixels(x, y);
    while (expand.expandBoundary()) {}
    return expand.getPixelsInfo();
}