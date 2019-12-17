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
var keepLooping = true;
var counter = 0;

//this makes sleep work
const sleep = (milliseconds) => {
	return new Promise(resolve => setTimeout(resolve, milliseconds))
}

client.on('message', message => {
	if (message.content === mcCommand) {

		keepLooping = false;

			//posts the embed, then initializes the edit sequence
			const embed = new RichEmbed()
			.setTitle('Loading...')
			.setColor(0xFF0000)
			.setDescription('Loading...');
			message.channel.send(embed).then(msg=>{



				async.whilst(
				function testCondition(what) {what(null, true)},
				function increaseCounter(next) {

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
						sleep(500).then(() => {
						var today = new Date();
						today = today.getHours() + ":" + today.getMinutes();
						const newEmbed = new RichEmbed()
							.setTitle(title)
							.setColor(0xFF0000)
							.setDescription(desc + "\n Last Updated " + today + " MST");
						msg.edit(newEmbed).catch(console.log);
						})

					setTimeout(next, 300000)
				})


			});





		
	} else if(message.content === stCommand) {
		keepLooping = true;
		console.log('Loop Stopped, Please delete message');
	}
});
