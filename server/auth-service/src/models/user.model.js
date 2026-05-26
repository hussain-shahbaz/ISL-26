import mongoose from "mongoose";
import bcrypt from "bcrypt";
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "Username is required"],
    unique: [true, "Username must be unique"],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: [true, "Email must be unique"],
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, "Password is required"],
  },
  verified: {
    type: Boolean,
    default: false,
  },
});
userSchema.pre("save", async function () {

  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 12);

});
userSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);

};
const User = mongoose.model("users", userSchema);
export default User;
