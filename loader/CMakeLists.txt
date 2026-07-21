cmake_minimum_required(VERSION 3.16)
project(PunchLoader CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

list(APPEND CMAKE_MODULE_PATH "${CMAKE_SOURCE_DIR}/deps/webview/cmake/modules")
include("${CMAKE_SOURCE_DIR}/deps/webview/cmake/webview.cmake")
webview_fetch_mswebview2("1.0.2210.55")
find_package(MSWebView2 REQUIRED)

set(WV2_ROOT "${CMAKE_BINARY_DIR}/_deps/microsoft_web_webview2-src")
set(WV2_NATIVE "${WV2_ROOT}/build/native/x64")

add_executable(punch-loader WIN32
  src/main.cpp
)

target_include_directories(punch-loader PRIVATE
  ${MSWebView2_INCLUDE_DIR}
)

target_compile_definitions(punch-loader PRIVATE
  UNICODE _UNICODE NOMINMAX
)

target_link_libraries(punch-loader PRIVATE
  "${WV2_NATIVE}/WebView2LoaderStatic.lib"
  ole32 oleaut32 shell32 shlwapi version user32 advapi32 dwmapi
)

add_custom_command(TARGET punch-loader POST_BUILD
  COMMAND ${CMAKE_COMMAND} -E copy_directory
    ${CMAKE_SOURCE_DIR}/ui $<TARGET_FILE_DIR:punch-loader>/ui
)
