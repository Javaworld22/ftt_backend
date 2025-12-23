_register = (firstName, lastName,email) => {
    console.log(`fistName ${firstName}`)
    return new Promise((resolve, reject) => {
                Teacher.create({firstName:firstName, lastName:lastName,email:email }).then((result) =>{
                console.log('Result is here ', result)
                resolve({ data: "Include state in your search", status: 400, msg: "No result found" });
               }).catch(error => {
                console.log('Erro here inserting to database ', error)
                reject({ status: 404, msg: `${error}` });
            })


});

};

module.exports = { _register };