import * as fs from 'fs';
import * as path from 'path';
import * as npmPackage from '../package.json';
import * as commandLineArgs from 'command-line-args';
import { OptionDefinition } from 'command-line-args';
import * as getUsage from 'command-line-usage';
import { avroToTypeScript, RecordType } from './avro-typescript';
import { fileURLToPath } from 'url';
import { getFilesFromInput } from './utils.js';

export interface IOptionDefinition extends OptionDefinition {
  description: string;
}

const optionDefinitions: IOptionDefinition[] = [
  {
    name: 'help',
    alias: 'h',
    type: Boolean,
    description: 'Show help text',
  },
  {
    name: 'input',
    alias: 'i',
    defaultOption: true,
    type: String,
    multiple: true,
    description: 'Input file or folder (default option, so i can be omitted). If folder, reads all *avsc files.',
  },
  {
    name: 'verbose',
    alias: 'v',
    type: Boolean,
    description: 'Turn verbose output on.',
  },
  {
    name: 'outFolder',
    alias: 'o',
    type: String,
    description: 'Location where you want to save the output files. If not supplied, use the input folder.',
  },
  {
    name: 'concat',
    alias: 'c',
    type: String,
    description: 'Concats all files and removes duplicated type definitions. Stores to specified location. Ignores outFolder.'
  },
];

const options = commandLineArgs(optionDefinitions) as {
  input: string[];
  concat?: string;
  verbose?: boolean;
  outFolder?: string;
  help: boolean;
};

const writeAvroFile = (outFile:string, buffer:string[]) => {
  const result = buffer.join('\n').replace(/\t/g, '  ');
  fs.writeFileSync(outFile, result, 'UTF8');
  if (options.verbose) {
    console.log(`${result} is written to ${outFile}.`);
  }
}

const sections = [
  {
    header: `${npmPackage.name}, v0.3.0`,
    content: `${npmPackage.license} license.

  ${npmPackage.description}

  Use avro-typescript-converter to infer a TypeScript interface based on an AVRO schema.
  `,
  },
  {
    header: 'Options',
    optionList: optionDefinitions,
  },
  {
    header: 'Examples',
    content: [
      {
        desc: '01. Convert a schema to an interface',
        example: '$ avro-typescript-converter example/standard_cap-value.avsc',
      },
      {
        desc: '02. Convert a schema to an interface, specifying the output folder',
        example: '$ avro-typescript-converter example/standard_cap-value.avsc -o output',
      },
      {
        desc: '03. Convert a schema to an interface, also displaying the output',
        example: '$ avro-typescript-converter -v example/standard_cap-value.avsc',
      },
      {
        desc: '04. Convert all schemas in a folder to an interface, also displaying the output',
        example: '$ avro-typescript-converter -v example/',
      },
      {
        desc: '0.5 Convert all schemas into a single file name avro.ts',
        example: '$ avro-typescript-converter -i avro-files/ -c avro.ts'
      }
    ],
  },
];

const convert = () => {
  if (!options || !options.input) {
    const usage = getUsage(sections);
    console.log(usage);
    process.exit(0);
  }
  const outFolder = options.outFolder ? path.resolve(process.cwd(), options.outFolder) : path.dirname(options.input[0]);
  if (!fs.existsSync(outFolder)) {
    fs.mkdirSync(outFolder);
  }
  options.input.forEach(input => {
    const validInputFiles = getFilesFromInput(input);
    const preventDuplicatedRecords = !!options.concat;
    let buffer:string[] = [];
    validInputFiles.forEach(input => {
        const schemaText = fs.readFileSync(input, 'UTF8');
        const schema = JSON.parse(schemaText) as RecordType;
        const outFile = `${path.basename(input, path.extname(input))}.ts`;
        avroToTypeScript(schema as RecordType, buffer, preventDuplicatedRecords);
        if (!options.concat) {
          writeAvroFile(path.join(outFolder, outFile), buffer);
          buffer = [];
        }
    });
    if (options.concat) {
      writeAvroFile(options.concat, buffer);
    }
  });
}

convert();
console.log('done');
