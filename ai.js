$(function() {
	AI.init();
});

var AI = {
	'configs': {
		'nInput': 4,
		'hiddenLayers': [3],
		'nOutput': 1,
		'DNAsPerGenenation': 12,
		'calcDelay': 16,
		'nBestDNAs': 2
	},

	'DNAs': [],
	'weights': [],
	'neurons': [],
	'DNAsScore': [],

	'nGeneration': 0,
	'currentDNA': 0,

	'init': function() {
		this.trex = Runner.instance_;
		this.neuronLayers = $.merge(this.configs.hiddenLayers.slice(0), [this.configs.nOutput]);
		this.weightLayers = $.merge([this.configs.nInput], this.configs.hiddenLayers.slice(0));

		this.initNeurons();
		this.performGeneration();
		this.learn();
	},

	'initNeurons': function() {
		$.each(this.neuronLayers, function(nLayer, nNeurons) {
			this.neurons.push([]);

			for (var i = 0; i < nNeurons; i++) {
				this.neurons[nLayer].push(0);
			}
		}.bind(this));
	},

	'performGeneration': function() {
		var bestDNAs = [];

		if (this.DNAsScore.length) {
			$.each(this.getBestDNAs(), function(i, iDNA) {
				if (bestDNAs.length < this.configs.nBestDNAs) {
					bestDNAs.push(this.DNAs[parseInt(iDNA)]);
				}
			}.bind(this));
		}

		this.DNAs = bestDNAs;

		for (var i = bestDNAs.length; i < this.configs.DNAsPerGenenation; i++) {
			var dna = [];

			for (var j = 0; j < this.getQtyWeights(); j++) {
				dna.push(Math.random());
			}

			this.DNAs.push(dna);
		}

		this.nGeneration++;
		this.setWeights(this.DNAs[this.currentDNA]);
	},

	'getBestDNAs': function() {
		var scoreObject = Object.assign({}, this.DNAsScore);
		var iScores = Object.keys(scoreObject).sort(function(a, b) {
			return scoreObject[b] - scoreObject[a]
		});

		return iScores;
	},

	'setWeights': function(weights) {
		var iWeight = 0;

		this.weights = [];

		$.each(this.weightLayers, function(iLayer, iNeurons) {
			this.weights.push([]);

			for (var i = 0; i < iNeurons; i++) {
				this.weights[iLayer].push([]);

				for (var j = 0; j < this.neuronLayers[iLayer]; j++) {
					this.weights[iLayer][i].push(weights[iWeight]);
					iWeight++;
				}
			}
		}.bind(this));
	},

	'getQtyWeights': function() {
		var res = 0;
		var layers = $.merge([this.configs.nInput], this.configs.hiddenLayers.slice(0));
		layers.push(this.configs.nOutput);

		$.each(layers, function(i, nNeurons) {
			if (typeof layers[i + 1] != 'undefined') {
				res += nNeurons * layers[i + 1];
			}
		});

		return res;
	},

	'sigmoid': function(t) {
		return 1 / (1 + Math.pow(Math.E, -t));
	},

	'calculate': function(inputData) {
		$.each(this.neurons, function(iNeurons, neurons) {
			var inputNeurons = (iNeurons ? this.neurons[iNeurons - 1] : inputData);

			$.each(neurons, function(iNeuron, neuron) {
				var outputNeuron = -1.32;

				$.each(inputNeurons, function(iInputNeuron, value) {
					outputNeuron += value * this.weights[iNeurons][iInputNeuron][iNeuron];
				}.bind(this));

				this.neurons[iNeurons][iNeuron] = this.sigmoid(outputNeuron);
			}.bind(this));
		}.bind(this));
	},

	'performAction': function(activation) {
		var e = new Event('keydown');

		if (activation < 0.45) {
			e.keyCode = 40;
		} else if (activation > 0.55) {
			e.keyCode = 38;
		} else {
			e = new Event('keyup');
			e.keyCode = 40;
		}

		document.dispatchEvent(e);
	},

	'getInputData': function() {
		var obstacle = this.trex.horizon.obstacles || [];
		var res = {};

		if (this.trex.playing && obstacle.length) {
			var tRex = this.trex.tRex;

			var tRexBox = {
				'x': tRex.xPos + 1,
				'y': tRex.yPos + 1,
				'w': tRex.config.WIDTH - 2,
				'h': tRex.config.HEIGHT - 2
			};

			var obstacleBox = {
				'x': obstacle[0].xPos + 1,
				'y': obstacle[0].yPos + 1,
				'w': obstacle[0].typeConfig.width * obstacle[0].size - 2,
				'h': obstacle[0].typeConfig.height - 2
			};

			res = {
				'obDistanceX': obstacleBox.x - (tRexBox.x + tRexBox.w),
				'obDistanceY': obstacleBox.y,
				'obWidth': obstacleBox.w,
				'trexSpeed': this.trex.currentSpeed
			}
		}

		return res;
	},

	'learn': function() {
		if (this.trex.crashed) {
			if (this.currentDNA < this.configs.DNAsPerGenenation) {
				this.DNAsScore[this.currentDNA] = this.trex.distanceRan;

				this.currentDNA++;
				if (this.currentDNA == this.configs.DNAsPerGenenation) {
					this.currentDNA = 0;
					this.performGeneration();
					this.setWeights(this.DNAs[this.currentDNA]);
				}
			}

			this.trex.restart();
			this.learn();
		} else {
			setTimeout(function() {
				var data = this.getInputData();

				if (!$.isEmptyObject(data)) {
					this.calculate([
						data.obDistanceX,
						data.obDistanceY,
						data.obWidth,
						data.trexSpeed
					]);

					this.performAction(this.neurons[this.neurons.length - 1][0]);
				}

				this.learn();
			}.bind(this), this.configs.calcDelay);
		}
	}
}