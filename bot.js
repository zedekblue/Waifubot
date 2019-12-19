var auth = require('./auth.json');
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
var mcIP = '174.23.176.52';
var mcPort = 41236;
var {title,desc} = '';
var {keepLooping,off,emptyServ,maintenance} = false;
var id = 0;

//this makes sleep work
const sleep = (milliseconds) => {
	return new Promise(resolve => setTimeout(resolve, milliseconds))
}

//checks for message
client.on('message', message => {
	if (message.content === mcCommand) {

		keepLooping = true;

		//posts the embed, then initializes the edit sequence
		const embed = new RichEmbed()
		.setTitle('Loading...')
		.setColor(0xFF0000)
		.setDescription('Loading...');
		message.channel.send(embed).then(msg=>{

			
			id = msg.id; //saves id of message to id

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
					body = JSON.parse(body);
					//assigns server status if no error
					if(body.online) {
						title = 'Server is online';
						//success, server online, everything running
						if(body.players.online) {
							desc = '**' + body.players.online + '/' + body.players.max + '**';
							emptyServ = false;
							playerz = body.players.list;
						} else {
							//server is online but booting
							if(body.players.max === null){
								desc = 'Server is booting up'
								emptyServ = true;
							//server is online but no players
							} else {
								desc = '**0/' + body.players.max + '**';
								emptyServ = true;
							}
						}
						off = false;
						//fail, server is offline
					} else {
						title = '**Server is offline**';
						desc = 'Please notify Zeal\nRestoring from a backup may be necessary';
						off = true;
					}
				});
				sleep(1000).then(() => { //stops message from being posted before status is updated
					var today = new Date();
					today = today.getHours() + ":" + (today.getMinutes()<10?'0':'') + today.getMinutes();
					if (maintenance === true){
						const newEmbed = new RichEmbed()
							.setTitle('**Undergoing Maintenance**')
							.setColor(0x6600CC)
							.setDescription("Please do not try to log in!\nLast Updated " + today + " MST");
						msg.edit(newEmbed).catch(console.log);
					} else {
						if (off === true){
							//offline
							const newEmbed = new RichEmbed()
								.setTitle(title)
								.setColor(0xFF0000)
								.setDescription(desc + "\nLast Updated " + today + " MST");
							msg.edit(newEmbed).catch(console.log);
						} else {
							if (emptyServ === true){
								//online but empty
								const newEmbed = new RichEmbed()
									.setTitle(title)
									.setColor(0xFF9900)
									.setDescription(desc + "\nLast Updated " + today + " MST");
								msg.edit(newEmbed).catch(console.log);
							} else {
								//online with players
								const newEmbed = new RichEmbed()
									.setTitle(title)
									.setColor(0x00FF0F)
									.setDescription(desc + '\n' + playerz + "\nLast Updated " + today + " MST");
								msg.edit(newEmbed).catch(console.log);
							}
						}
					}
				})


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
		today = today.getHours() + ":" + (today.getMinutes()<10?'0':'') + today.getMinutes();
		const newerEmbed = new RichEmbed()
		.setTitle('**Undergoing Maintenance**')
		.setColor(0x6600CC)
		.setDescription("Please do not try to log in!\nLast Updated " + today + " MST");
		message.channel.fetchMessages({around: id, limit: 1}).then(msg => {
			const fetchedMsg = msg.first();
			fetchedMsg.edit(newerEmbed);
		});
	} else if(message.content === mtCommandStop){
		maintenance = false;
	} else if(message.content === btCommandStart) {
		keepLooping = false;
		var today = new Date();
		today = today.getHours() + ":" + (today.getMinutes()<10?'0':'') + today.getMinutes();
		const newerEmbed = new RichEmbed()
		.setTitle('**Waifubot Undergoing Maintenance!**')
		.setColor(0x6600CC)
		.setDescription('As of ' + today + ' MST');
		message.channel.fetchMessages({around: id, limit: 1}).then(msg => {
			const fetchedMsg = msg.first();
			fetchedMsg.edit(newerEmbed);
		});
	}
});
