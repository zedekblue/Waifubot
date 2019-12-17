var auth = require('./auth.json');
const { Client, RichEmbed } = require('discord.js');
const client = new Client();
client.login(auth.token);

var request = require('request');
var async = require("async");
var mcCommand = '.mc'; // Command for triggering
var stCommand = '.st'; // Command for stopping
var mcIP = '174.23.176.52';
var mcPort = 41236;
var {title,desc} = '';
var keepLooping = false;
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
				var url = 'http://mcapi.us/server/status?ip=' + mcIP + '&port=' + mcPort;
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
						if(body.players.now) {
							desc = '**' + body.players.now + '/10**';
						} else {
							desc = '**0/10**';
						}
					} else {
						title = '**Server is offline**';
						desc = '';
					}
				});
				sleep(500).then(() => { //stops message from being posted before status is updated
					var today = new Date();
					today = today.getHours() + ":" + (today.getMinutes()<10?'0':'') + today.getMinutes();
					const newEmbed = new RichEmbed()
						.setTitle(title)
						.setColor(0x00FF0F)
						.setDescription(desc + "\n Last Updated " + today + " MST");
					msg.edit(newEmbed).catch(console.log);
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
	}
});
