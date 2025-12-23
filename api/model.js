const { mongoose } = require("mongoose");
const schema = mongoose.Schema;

const ProjectOwnerSchema = new schema({
    //mongoose.Schema.ObjectI
    fullname: String,
    phoneNumber: String,
    email:{type: String, trim: true, index: true, unique: true, sparse: true },
    organization: String,
    password: String,
    confirmPassword: String,
  }, {
    timestamps: true
  });

  const ProjectOwner = mongoose.model("ProjectOwner", ProjectOwnerSchema);

  module.exports = {
    ProjectOwner
  };