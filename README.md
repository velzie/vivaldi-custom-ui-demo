# Example vivaldi custom ui

Example used in [this blog post](https://velzie.rip/blog/vivaldi)
<img width="801" height="775" alt="image" src="https://github.com/user-attachments/assets/8807311d-ec3a-4640-a7ee-ab32fe08ee8e" />

setup
- install vivaldi
- copy the entire folder where the binary is from `/opt/vivaldi/` or wherever to `./vivaldi` in this dir
- pnpm i
- pnpm rspack build
- ./vivaldi/vivaldi --user-data-dir=./data
