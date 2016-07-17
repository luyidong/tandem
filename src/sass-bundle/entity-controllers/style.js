import { FactoryFragment } from 'common/fragments';
import CoreObject from 'common/object';
import sass from 'sass.js';
import FragmentSection from 'common/section/fragment';


export default class StyleEntityController extends CoreObject {

  constructor(properties) {
    super(properties);
    this.section = FragmentSection.create();
    this.entity.visible = false;
  }

  setAttribute(key, value) {

  }

  async load({ section }) {
    var source = this.entity.expression.childNodes[0].nodeValue;

    // TODO
    // const _watchFile = async (path) => {
    //   var stream = this.bus.execute({
    //     type: 'watchFile',
    //     path: path
    //   });
    //   let value;
    //   while ({ value } = await stream.read()) {
    //     console.log(value);
    //   }
    // };

    sass.importer(async (request, resolve) => {
      // _watchFile(request.resolved);
      resolve((await this.bus.execute({
        type: 'readFile',
        path: request.resolved
      }).read()).value);
    });

    var { text } = await new Promise((resolve, reject) => {
      sass.compile(source, { inputPath: this.file.path }, function (result) {
        if (result.text) return resolve(result);
        reject(result);
      });
    });

    var node = this.node = document.createElement('style');
    node.setAttribute('type', 'text/css');
    node.appendChild(document.createTextNode(text));

    section.appendChild(node);
  }

  update() {

  }
}

export const fragment = FactoryFragment.create({
  ns: 'entity-controllers/style',
  test(entity) {
    return entity.attributes.type === 'text/scss';
  },
  factory: StyleEntityController
});
