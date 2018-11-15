import {core, flags, SfdxCommand} from '@salesforce/command';

// Initialize Messages with the current plugin directory
core.Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = core.Messages.loadMessages('ftd18', 'coverage');

export default class Org extends SfdxCommand {

  public static description = messages.getMessage('commandDescription');

  public static examples = [
  `$ sfdx hello:org --targetusername myOrg@example.com --targetdevhubusername devhub@org.com
  Hello world! This is org: MyOrg and I will be around until Tue Mar 20 2018!
  My hub org id is: 00Dxx000000001234
  `,
  `$ sfdx hello:org --name myname --targetusername myOrg@example.com
  Hello myname! This is org: MyOrg and I will be around until Tue Mar 20 2018!
  `
  ];

  public static args = [{name: 'file'}];

  protected static flagsConfig = {
    // flag with a value (-n, --name=VALUE)
    format: flags.string({char: 'f', description: messages.getMessage('formatFlagDescription')})
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Comment this out if your command does not support a hub org username
  protected static supportsDevhubUsername = false;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = false;

  public async run(): Promise<core.AnyJson> {
    const outputFormat = this.flags.format || '';

    // this.org is guaranteed because requiresUsername=true, as opposed to supportsUsername
    const conn = this.org.getConnection();

    var apexClassList = await conn.metadata.list({type: 'ApexClass'});

    var apexClasses = Array();
    for (let i = 0; i < apexClassList.length; i++) {
        var element = apexClassList[i];
        if(element.fullName.toLowerCase().indexOf('test') == -1){
            apexClasses.push(element);
        }
    }

    var coverage = Array();
    for (let i = 0; i < apexClasses.length; i++) {
        const element = apexClasses[i];
        var classCoverage = await conn.tooling.sobject('ApexCodeCoverage').find(
            {ApexClassOrTriggerId: element.id}, function (err, records){
                if(err) return console.error(err);
                return records[0];
            }
        );
        
        var progressSize = 10;
        if(classCoverage != undefined){
            var covered = Math.round(classCoverage['NumLinesCovered'] * 100 / (classCoverage['NumLinesCovered']+classCoverage['NumLinesUncovered']));
            var progress = Math.round(progressSize*covered/100);
            coverage.push({
                classid: element.id,
                classname: element.fullName,
                nblinescovered: classCoverage['NumLinesCovered'],
                nblinesuncovered: classCoverage['NumLinesUncovered'],
                coverage: covered + '%',
                progress: '[' + ''.padStart(progress, '#').padEnd(progressSize, ' ') + ']'
            });
        }else{
            coverage.push({
                classid: element.id,
                classname: element.fullName,
                nblinescovered: 0,
                nblinesuncovered: 0,
                coverage: 0,
                progress: '[' + ''.padStart(progressSize, ' ') + ']'
            });
        }

    }



    if(outputFormat == 'csv'){
        var properties = Object.keys(coverage[0]);
        console.log(properties.join(',')); //headers

        for (let i = 0; i < properties.length; i++) {
            var values = Object.values(coverage[i]);
            console.log(values.join(',')); // rows
        }
    }

    return coverage;



    // Return an object to be displayed with --json

  }}
