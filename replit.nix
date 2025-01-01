{pkgs}: {
  deps = [
    pkgs.procps
    pkgs.lsof
    pkgs.postgresql
    pkgs.libxcrypt
    pkgs.bash
  ];
}
