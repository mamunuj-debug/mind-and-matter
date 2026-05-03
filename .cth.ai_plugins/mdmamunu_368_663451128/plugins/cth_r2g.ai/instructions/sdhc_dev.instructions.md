---
description: 'Health Checks TCL Coding Guidelines: This document provides guidelines for developing health checks in TCL for use in the Cheetah ward. It covers the standard structure of health check procs, required fields, and best practices for implementation.'
applyTo: '**/*.tcl'
---

Health checks are implemented as TCL procs (template: hc_check_<name>) with standardized header/footer, report fields, error lists and return/pass value.
Checks are organized by flow/task and enabled via ivars such as ivar(<flow>,<task>,healthchecks) and controlled globally by ivar(hc,run_health_checks).
Technology/project/local ivars (e.g., hpml, map_metal_prefix, hc-specific ivars) must be set appropriately; some checks are tech-specific.

This is the template for a health check proc:

```tcl
proc hc_check_<name> {args} { 
    global ivar 
    global env 
    set arg(-stage) ""  
    parse_proc_arguments -args $args arg 
    set blockname [get_attribute -quiet [current_block] name]  
    set checkname check_<name>
    set stage [hc_get_stage -stage $arg(-stage)] 
    hc_header -checker_name $checkname  


    set rptfields <list of column headers in report file> Ex: {Block_name Axis Reference_Lego Violating_Coordinate} 
    set errmsgs [list] 
    set err_boundary_list [list] 
    set err_information_list [list] 
    set pass 0 

    ***** ALGORITHM***** 

    hc_footer -checker_name $checkname -stage $stage -rptfields $rptfields -error_msgs $errmsgs -error_bbox_list $err_boundary_list -error_info_list $err_information_list 
    return $pass 
} 

define_proc_attributes hc_check_<name> \ 
    -info "<short check description>" \ 
    -define_args { <Any flags used in the check. For example:>  
        {-polygon "Specify a rectangle or polygon to check" string string required} 
        {-top_block_only "Run only if current block is top block" "" boolean optional} 

        {-stage "Stage name" string string optional}  → <Mandatory for every check>
    } 

```


*Italics section of the template are description/examples. 

Here is an example health check proc:

```tcl
proc hc_check_ports_missing_terminal {args} {
    global ivar
    set arg(-stage) ""
    parse_proc_arguments -args $args arg

    set checkname "check_ports_missing_terminal"
    set stage [hc_get_stage -stage $arg(-stage)]
    hc_header -checker_name $checkname

    set rptfields {Port_missing_terminal_name}
    set errmsgs [list]
    set pass 0

    foreach_in_collection port [get_ports -quiet] {
        if {[sizeof_collection [get_shapes -quiet -of_objects $port]] == 0} {
            set port_name [get_attribute -quiet $port name] 
            set errmsg "$port_name"
            lappend errmsgs $errmsg
            incr pass 1
        }
    }

    hc_footer -checker_name $checkname -stage $stage -rptfields $rptfields -error_msgs $errmsgs
    return $pass 
}
define_proc_attributes hc_check_ports_missing_terminal \
    -info "Check if ports do not have terminals associated with them" \
    -define_args {
        {-stage "Stage name" string string optional}
    }

```