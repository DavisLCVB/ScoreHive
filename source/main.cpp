#include <actors/worker.hpp>
#include <iostream>

String get_role(int argc, char** argv);

i32 main(i32 argc, char** argv) {
  try {
    String role = get_role(argc, argv);
    if (role == "server") {
      return Worker::main(argc, argv);
    } else if (role == "client") {
      return 0;
    }
  } catch (const Exception& e) {
    std::cerr << "Error: " << e.what() << std::endl;
    return 1;
  }
}

String get_role(int argc, char** argv) {
  if (argc < 2) {
    throw std::runtime_error("Role not specified");
  }
  String role = argv[1];
  if (role != "server" && role != "client") {
    throw std::runtime_error("Invalid role: " + role);
  }
  return role;
}