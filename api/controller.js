
register = (req, res, next) => {
	const { firstName, lastName,email } = req.query;
	console.log(req.query);
	_register(firstName, lastName,email).then((resp) => {
		if (email && lastName) {
			res.status(200).json({
				success: true,
				msg: "User retrieved!",
				data: resp
			});
		} else {
			res.status(400).json({
				success: false,
				msg: "Error data. parameter is empty!",
				data: resp
			});
		}
	}).catch((err) => {
		res.status(404).json({
			success: false,
			msg: `Error occured ${err}`,
			error: err
		});
	});
};