var auth = require('./auth.json');
var servAddress = require('./ip.json');
//var url = require('./api.json');
const { Client, RichEmbed } = require('discord.js');
const client = new Client();
client.login(auth.token);

var request = require('request');
var async = require("async");
var mcCommand = '.mc'; // Command for triggering
var stCommand = '.st'; // Command for stopping
var mtCommandStart = '.ms'; //Command to Start Server Maintenance
var mtCommandStop = '.me'; //Command to Stop Server Maintenance
var btCommandStart = '.bms'; //Command to Start Bot Maintenance
var cmdHelp = '.help';
var mcIP = servAddress.ip;
var mcPort = servAddress.port;
var {title,desc} = '';
var {keepLooping,off,emptyServ,maintenance,apiError} = false;
var id = 0;
var firstRun = 0;
var playerz = '';
var lastConsoleMsg = '';
var idk = '';
console.log('Bot Online');

//this makes sleep work
const sleep = (milliseconds) => {
	return new Promise(resolve => setTimeout(resolve, milliseconds))
}

//checks for message
client.on('message', message => {
	if (message.content === mcCommand) {
		console.log('Posting message...');
		keepLooping = true;

		//posts the embed, then initializes the edit sequence
		const embed = new RichEmbed()
		.setTitle('Loading...')
		.setColor(0xFF0000)
		.setDescription('Loading...');
		message.channel.send(embed).then(msg=>{

			
			id = msg.id; //saves id of message to id
			idk = message.channel.toString();
			console.log('Posted in ' + idk);

			//continues to loop until exit command is sent
			async.whilst(
			function testCondition(what) {what(null, keepLooping)},
			function actualLoop(next) {


				//gets the server status
				var url = 'https://api.mcsrvstat.us/2/' + mcIP + ':' + mcPort;
				request(url, function(err, response, body) {
					//checks for error
					if(err) {
						console.log(err);
						title = '**Error Getting Server Status**';
						desc = '**n/a**';
					}
					apiNoError = false;
					try{
						body = JSON.parse(body);
						apiNoError = true;
					}
					catch (e) {
						apiNoError = false;
					}
					//assigns server status if no error
					if(apiNoError) {
						title = 'Server is online';
						//success, server online, everything running
						try{
							if(body.players.online) {
								desc = mcIP + ':' + mcPort + '\n**' + body.players.online + '/' + body.players.max + '**';
								emptyServ = false;
								playerz = body.players.list;
							} else {
								//server is online but booting
								if(body.players.max === null){
									desc = 'Server is booting up'
									emptyServ = true;
								//server is online but no players
								} else {
									desc = mcIP + ':' + mcPort + '\n**0/' + body.players.max + '**';
									emptyServ = true;
								}
							}
							off = false;
						}
						catch (e) {
							title = '**Server is offline**';
							desc = mcIP + ':' + mcPort + '\nAPI may just be down.\nIf you cannot connect, please notify Zeal';
							off = true;
						}
						//fail, server is offline
					} else {
						title = '**Server is offline**';
						desc = mcIP + ':' + mcPort + '\nAPI may just be down.\nIf you cannot connect, please notify Zeal';
						off = true;
					}
				});
				if (firstRun === 0) {
					sleep(1000).then(() => {
						firstRun = 1; 
					})
				} else {
					sleep(1000).then(() => { //stops message from being posted before status is updated
						var today = new Date();
						today = today.getUTCHours() + ":" + (today.getUTCMinutes()<10?'0':'') + today.getUTCMinutes();
						if (maintenance === true){
							if(lastConsoleMsg != 'Under Maint...') {
								lastConsoleMsg = 'Under Maint...';
								console.log(lastConsoleMsg);
							}
							const newEmbed = new RichEmbed()
								.setTitle('**Undergoing Maintenance**')
								.setColor(0x6600CC)
								.setDescription("Please do not try to log in!")
								.setFooter("Last Updated " + today + " UTC");
							msg.edit(newEmbed).catch(console.log);
						} else {
							if (off === true){
								if(lastConsoleMsg != 'Offline!!!') {
									lastConsoleMsg = 'Offline!!!';
									console.log(lastConsoleMsg);
								}
								//offline
								const newEmbed = new RichEmbed()
									.setTitle(title)
									.setColor(0xFF0000)
									.setDescription(desc)
									.setFooter("Last Updated " + today + " UTC");
								msg.edit(newEmbed).catch(console.log);
							} else {
								if(lastConsoleMsg != 'Online') {
									lastConsoleMsg = 'Online';
									console.log(lastConsoleMsg);
								}
								if (emptyServ === true){
									//online but empty
									const newEmbed = new RichEmbed()
										.setTitle(title)
										.setColor(0xFF9900)
										.setDescription(desc)
										.setFooter("Last Updated " + today + " UTC");
									msg.edit(newEmbed).catch(console.log);
								} else {
									//online with players
									const newEmbed = new RichEmbed()
										.setTitle(title)
										.setColor(0x00FF0F)
										.setDescription(desc + '\n' + playerz)
										.setFooter("Last Updated " + today + " UTC");
									msg.edit(newEmbed).catch(console.log);
								}
							}
						}
					})
				}


				//loops every minute
				setTimeout(next, 60000)
			})


		});
		
	//when exit command is sent, stop the above loop
	} else if(message.content === stCommand) {
		keepLooping = false;
		const newerEmbed = new RichEmbed()
		.setTitle('Bot Offline...')
		.setColor(0xFF0000)
		.setDescription('');
		message.channel.fetchMessages({around: id, limit: 1}).then(msg => {
			const fetchedMsg = msg.first();
			fetchedMsg.edit(newerEmbed);
		});
	} else if(message.content === mtCommandStart){
		maintenance = true;
		var today = new Date();
		today = today.getUTCHours() + ":" + (today.getUTCMinutes()<10?'0':'') + today.getUTCMinutes();
		const newerEmbed = new RichEmbed()
		.setTitle('**Undergoing Maintenance**')
		.setColor(0x6600CC)
		.setDescription("Please do not try to log in!")
		.setFooter("Last Updated " + today + " UTC");
		message.channel.fetchMessages({around: id, limit: 1}).then(msg => {
			const fetchedMsg = msg.first();
			fetchedMsg.edit(newerEmbed);
		});
	} else if(message.content === mtCommandStop){
		maintenance = false;
	} else if(message.content === btCommandStart) {
		keepLooping = false;
		var today = new Date();
		today = today.getUTCHours() + ":" + (today.getUTCMinutes()<10?'0':'') + today.getUTCMinutes();
		const newerEmbed = new RichEmbed()
		.setTitle('**Waifubot Undergoing Maintenance!**')
		.setColor(0x6600CC)
		.setDescription('As of ' + today + ' MST');
		message.channel.fetchMessages({around: id, limit: 1}).then(msg => {
			const fetchedMsg = msg.first();
			fetchedMsg.edit(newerEmbed);
		});
	} else if(message.content === cmdHelp){
		const embed = new RichEmbed()
		.setTitle('Help')
		.setColor(0x6600CC)
		.setDescription('List of commands:\n.mc | Creates the status message\n.st | Stops updating the status message\n.ms | Starts server maintenance\n.me | Stops server maintenance\n.bms | Starts Bot maintenance (embed will need to be remade)');
		message.channel.send(embed)
	}
});
