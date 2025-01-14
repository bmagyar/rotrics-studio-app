import * as THREE from 'three';
import { getIsAdvance } from '../utils'


// TextSprite
class TextSprite {
    // @param {object} options The options object
    // @param {number} [options.x] The point on the x-axis
    // @param {number} [options.y] The point on the y-axis
    // @param {number} [options.z] The point on the z-axis
    // @param {string} [options.text] The text string
    // @param {number} [options.size] The actual font size
    // @param {number|string} [options.color] The color
    // @param {number} [options.opacity] The opacity of text [0,1]
    constructor(options) {
        options = options || {};
        let { opacity = 0.6, size = 10 } = options;

        let textObject = new THREE.Object3D();
        let textHeight = 100;
        let textWidth = 0;

        let canvas = document.createElement('canvas');
        let context = canvas.getContext('2d');
        context.font = 'normal ' + textHeight + 'px Arial';
        let metrics = context.measureText(options.text);
        textWidth = metrics.width;

        canvas.width = textWidth;
        canvas.height = textHeight;

        context.font = 'normal ' + textHeight + 'px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = options.color;
        context.fillText(options.text, textWidth / 2, textHeight / 2);

        let texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        texture.minFilter = THREE.LinearFilter;
        // texture.magFilter = THREE.NearestFilter; // 提高清晰度，不加这两句画布会变模糊
        // texture.minFilter = THREE.NearestFilter;

        let material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: opacity,
            // sizeAttenuation:false
        });

        textObject.position.x = options.x || 0;
        textObject.position.y = options.y || 0;
        textObject.position.z = options.z || 0;
        textObject.textHeight = size;
        textObject.textWidth = (textWidth / textHeight) * textObject.textHeight;

        let sprite = new THREE.Sprite(material);
        sprite.scale.set(textWidth / textHeight * size, size, 1);

        textObject.add(sprite);

        // console.log('修改红字')
        // console.log(options)
        // console.log(getIsAdvance())
        // if (options.checkIsAdvance && getIsAdvance()) {
        //     textObject.translateY(-200)
        // }

        return textObject;
    }
}

export default TextSprite;
