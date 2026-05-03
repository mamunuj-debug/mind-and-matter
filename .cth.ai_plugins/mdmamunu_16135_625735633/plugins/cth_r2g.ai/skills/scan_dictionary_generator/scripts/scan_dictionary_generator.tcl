#!/usr/intel/bin/tclsh8.6

proc usage {} {  
   puts "\nTo run, please execute with below command ipScanChainsExtraction.tcl :\n\t -scanSignal <required path to *report_dft_signal*> \n\t -scanPath <required path to scan path report> \n\t -template </p/hdk/pu_tu/prd/sage/<sage version>/template/templates/ip.scanDictionary_template.csv> \n\t -nonScan <optional switch to pass nonscan script> \n\t -csv <output csv file> \n\t"
   puts "To generate dofile by excluding the ultiscan signal :\n\t -scanSignal <required path to *report_dft_signal> \n\t -extractNonUscConstrains 1 \n\t -outputDofile <output dofile path> \n\t" 
   puts "For others , please contact sage_supports \n\t"
}

global env
set state flag
set template ""
set scanSignal ""
set nonScan ""
set scanPath ""
set csv ""
set extractNonUscConstrains 0
set outputDofile ""

foreach arg $argv {
   switch -- $state {
     flag {
            switch -glob -- $arg {
                -help { usage; exit 0; }
                -extractNonUscConstrains { set state extractNonUscConstrains; }
		-outputDofile { set state outputDofile; }
		-scanSignal { set state scanSignal; }
                -scanPath { set state scanPath; }
	        -template { set state template; }
                -nonScan {set state nonScan; }
                -csv {set state csv; }
                default {puts "invalid switches! Please check the syntax of the switches given or do -help for more info" ; exit 1; }
            }
     }

     scanSignal {
            set scanSignal $arg
            set state flag
     }

     extractNonUscConstrains {
            set extractNonUscConstrains $arg
            set state flag
     } 
     outputDofile {
            set outputDofile $arg
            set state flag
     } 
     template {
            set template $arg
            set state flag
     }

     scanPath {
            set scanPath $arg
            set state flag
     }

     nonScan {
            set nonScan $arg
            set state flag
     }

     csv {
            set csv $arg
            set state flag
     }

   }
}

proc extractNonUscSignal {scanSignalRef outputDofileRef} {
     upvar $scanSignalRef scanSignal
     upvar $outputDofileRef outputDofile
     set errorCode [catch {open $scanSignal r} fileId]
     set errorCode [catch {open $outputDofile w} writeId]
     while {![eof $fileId]} {
        # Read the next line
        set line [gets $fileId]
        # Check if the line contains "Constant" and does NOT contain "*fscan_*"
        if {[string match "*Constant*" $line] && ![string match "*fscan_*" $line]} {
            # Use regular expression to extract the digit (0 or 1)
            if {[regexp {^(.*)\s+Constant\s+(\d)} $line match pin value]} {
                # Output the digit
                if {[regexp {/} $pin]} {
                   puts $writeId "add_primary_input $pin -internal"
                }
                puts $writeId "add_input_constraint $pin -C${value}"
            }
        }
     }
     # Close the file
     close $fileId
     close $writeId
     return 0
} 

proc extractNonScan {scanConfigFileRef} {
        upvar $scanConfigFileRef scanConfigFile
        set outputNonScanFile ".nonscan.tcl"
        set errorCode [catch {open $scanConfigFile r} rfd]
        set errorCode [catch {open $outputNonScanFile w} wfd]
        set nonscan_instances 0
        set nonscan_designs 0
        set nonscan_from_cth_fe 0
        set nonscan_instance_value ""
        set nonscan_design_value ""
        while { [gets $rfd line] >= 0 } {
            if {([regexp { ::dft::nonscan_designs } $line] || $nonscan_designs == 1)} {
                if {([regexp {\"} $line] && $nonscan_designs == 1)} {
                    set nonscan_designs 0
                } else {
                    set nonscan_designs 1
                }
                set line [string map {"::dft::" ""} $line]
                puts $wfd $line
            }

            if {([regexp { ::dft::nonscan_instances } $line] || $nonscan_instances == 1)} {
                if {([regexp {\"} $line] && $nonscan_instances == 1)} {
                    set nonscan_instances 0
                } else {
                    set nonscan_instances 1
                }
                set line [string map {"::dft::" ""} $line]
                puts $wfd $line
            }

            if {([regexp {set_scan_element false} $line] && [regexp {full_name} $line])} {
                set nonscan_from_cth_fe 1
                set line [string map {"[" "" "]" "" "\=\~" " "} $line]
                append nonscan_instance_value "[lindex [split $line " "] end] "
                append nonscan_design_value "[lindex [split $line " "] end] "
            }
        }

        if {$nonscan_from_cth_fe == 1} {
           puts $wfd "set nonscan_designs \"$nonscan_instance_value\""
           puts $wfd "set nonscan_instances \"$nonscan_design_value\""
        }
        close $rfd
        close $wfd
        return 0
}

proc sanityCheck {chassisSignalFromTempRef portName} {
   upvar $chassisSignalFromTempRef chassisSignalFromTemp
   set pinPort $portName
   set regMatch 0
   foreach key [array names chassisSignalFromTemp] {
      if {$key != " " && $key != ""} {
         set reg_key [string map {"*" ".*"} $key]
         if {![regexp {\*} $reg_key]} {
            set reg_key "\^$reg_key\$"
         }
         set pinPort [string trimright $pinPort]
         if {[regexp $reg_key $pinPort]} {
             set regMatch 1
         }
      }
   }
   return $regMatch
}


proc extractScanChain {scanPathRef} {
        upvar $scanPathRef scanPath
        set outputChainFile "scan_chain.do"
        set startToExtract 0
        set errorCode [catch {open $scanPath r} rfd]
        set errorCode [catch {open $outputChainFile w} wfd]
        set addOneIndex 0
        set headerLength 0
        set chainNum 0
        while {[gets $rfd line] >= 0} {
            set line [regexp -inline -all -- {\S+} $line]
            if {[regexp {==========} $line] || [regexp {^\s*$} $line] } {
                set startToExtract 0
            } elseif {([regexp "ScanDataIn" $line] || $startToExtract == 1)} {
                if {$startToExtract == 0} {
		   set headerLength [llength $line]
                   set startToExtract 1
                   set newLine [split $line " "]
                   set scanDataInIndex  [lsearch $newLine "ScanDataIn"]
                   set scanDataOutIndex [lsearch $newLine "ScanDataOut"]
                   continue;
                }
                if {![regexp {^\s*-----.*} $line]} {
                  set newLine [split $line " "]
                 # set chainNum [lindex $newLine 0]
                 # if {![string is integer $chainNum]} {
                 #   set chainNum [lindex $newLine 1]
                 #   if {$addOneIndex == 0} {
                 #     incr scanDataInIndex
                 #     incr scanDataOutIndex
                 #     set addOneIndex 1
                 #   }
                 # }
         
                   if {$headerLength > [llength $line]} {
                     set scanDataIn [lindex $newLine [expr $scanDataInIndex - [expr $headerLength - [llength $line]]]]
                     set scanDataOut [lindex $newLine [expr $scanDataOutIndex - [expr $headerLength - [llength $line]]]]
                   } elseif {[llength $line] > $headerLength} {
                     set subtract [expr [llength $line] - $headerLength]
                     set scanDataIn [lindex $newLine [expr $scanDataInIndex + $subtract]]
                     set scanDataOut [lindex $newLine [expr $scanDataOutIndex + $subtract]]
                   } else {
                     set scanDataIn [lindex $newLine $scanDataInIndex]
                     set scanDataOut [lindex $newLine $scanDataOutIndex]
                   } 

                  #if {[string is integer $chainNum]} {
                     puts $wfd "add scan chains -internal chain_$chainNum grp1 $scanDataIn $scanDataOut"
                     incr chainNum
                  #}
                }
            }
        }
        close $rfd
        close $wfd
        return 0
}

if {![file exists $scanSignal]} {
  puts "-E- $scanSignal not exists ! Please point to the path where it is exists!\n"
  exit 1
} else {
  puts "\n-I- Given dft signal report file $scanSignal"
} 

if {$extractNonUscConstrains == 0} {
   if {![file exists $template ]} {
      puts "-E- \"\-template\" not exists ! Please point to the path where it is exists!\n "
      exit 1
   }
   
   if {![catch {exec grep "Nofault" $template}]} {
     set nofault_ele [split [string map {"," "" "Nofault" "" "disposition" "" "instance" "" "module" "" ":" ""} [exec grep "Nofault" $template]] \n]
   } else {
     puts "-I- No nofaulting found in the template"
     set nofault_ele ""
   }
   
   if {![file exists $scanSignal]} {
     puts "-E- $scanSignal not exists ! Please point to the path where it is exists!\n"
     exit 1
   }
   
   set errorCode [catch {open $scanSignal r} scrfd] 
   set errorCode [catch {open $template r} trfd]
   set errorCode [catch {open $csv w} wfd]
   set regexpToMatch ""
   
   ### Store all the signal from CSV template
   array set chassisSignalFromTemp {};
   array set nonfaultsElement {};
   while {[gets $trfd line] >= 0} {
      if {![regexp "reg_exp\/pin_name" $line] && ![regexp "Nofault" $line] && ![regexp "#" $line] && ![regexp "^  " $line]} {
        set sigName [lindex [split $line ","] 0]
        set chassisSignalFromTemp($sigName) "$line"
      } elseif {![regexp "reg_exp\/pin_name" $line] && [regexp "Nofault" $line] && ![regexp "#" $line]} {
        set sigName [lindex [split $line ","] 0]
        set nonfaultsElement($sigName) "$line"
      }  
   }
   close $trfd
   
   ### Extract the signal from dft_signal_path , then check if it is a chassis signal. 
   ### If is, then take the template setting as priorities, else take the signal from dft report
   while {[gets $scrfd line] >= 0} {
      set regMatch 0
      if {[regexp {(.*)\s+Reset\s+(\d)\s+\-.*} $line match pinPort constraint]} {
         if {![regexp "\/" $pinPort] && ![regexp "^\/" $pinPort]} {
            set pinPort [string trimright $pinPort]
            set regMatch [sanityCheck chassisSignalFromTemp $pinPort]
            if {$constraint == 1} {
              set constraint 0
            } else {
              set constraint 1 
            }
   
            if {$regMatch == 0} {
               set chassisSignalFromTemp($pinPort) "${pinPort},SCAN_CTRL_SIGNALS,_ip_fscan_byprst_b,,,,,,$constraint,Default,,"             
            } 
         }                            
      } elseif {[regexp {(.*)\s+ScanMasterClock\s+.*} $line match pinPort] || [regexp {(.*)\s+MasterClock\s+.*} $line match pinPort]} {
          if {![regexp "\/" $pinPort] && ![regexp "^\/" $pinPort]} {
            set pinPort [string trimright $pinPort]
            set regMatch [sanityCheck chassisSignalFromTemp $pinPort]
            if {$regMatch == 0} {
               set chassisSignalFromTemp($pinPort) "${pinPort},SCAN_CLOCKS,_shift_clock,,,,,,0,Default,,"   
            }   
         }   
      } elseif {[regexp {(.*)\s+Constant\s+(\d)\s+\-.*} $line match pinPort constraint]} {
         #HSD : 16021690389
         if {![regexp "^\/" $pinPort]} {
           set pinPort [string trimright $pinPort]
           set regMatch [sanityCheck chassisSignalFromTemp $pinPort]
           if {$regMatch == 0} {
               set chassisSignalFromTemp($pinPort) "${pinPort},SCAN_CTRL_SIGNALS,,C${constraint},,,,,,,,"
            }   
         }   
      } elseif {[regexp {(.*)\s+ScanEnable\s+(\-?|\d?)\s+(.*)\s+.*} $line match pinPort junk hook]} {
         if {![regexp "\/" $pinPort] && ![regexp "^\/" $pinPort]} {
            set pinPort [string trimright $pinPort]
            set regMatch [sanityCheck chassisSignalFromTemp $pinPort]
            if {$regMatch == 0} {
               set chassisSignalFromTemp($pinPort) "${pinPort},SCAN_CTRL_SIGNALS,,C1,,,,,,,,"
            }
         }
      } elseif {[regexp {(.*)\s+TestMode\s+(\d?|\-?)\s+(.*)\s+(.*)} $line match pinPort constraint clockgate]} {
         if {![regexp "\/" $pinPort] && ![regexp "^\/" $pinPort]} {
            set pinPort [string trimright $pinPort]
            set regMatch [sanityCheck chassisSignalFromTemp $pinPort]
            if {$regMatch == 0} {
               set chassisSignalFromTemp($pinPort) "${pinPort},SCAN_CTRL_SIGNALS,,C1,,,,,,,,"
            }
         }
      } 
   }
   close $scrfd
   
   
   
   ###########################
   #### start to print the csv
   puts $wfd "reg_exp/pin_name,TYPE,NAME/ALIAS,CONSTRAINT,TOOL_VAR_NAME,TOOL_VAR_VALUE,ELSE_UNCONSTRAINT,CUTNAME,CLOCK_OFFSTATE,CLOCK_PULSE,FREQUENCY,SYNC_GROUP"
   foreach key [lsort [array names chassisSignalFromTemp]] {
      puts $wfd $chassisSignalFromTemp($key)
   }
   
   #set nonscanProcess 0
   array set nonfaultsTemp {};
   if {[file exists $nonScan]} {
      puts "-INFO-    Found [exec realpath $nonScan]"
      source $nonScan 
      if {[info exists ::dft::nonscan_designs]} {
         foreach nonscan_design $::dft::nonscan_designs {
           set regMatch 0
           foreach key [array names nonfaultsElement] {
              if {$key == " "} { continue }
              set reg_key [string map {"*" ".*"} $key] 
              if {[regexp $reg_key $nonscan_design]} {
                  set regMatch 1
                  continue
              }
           }
   
           if {$regMatch == "0"} {
             #puts $wfd "$nonscan_design,Nofault,,module,,,,,,,," 
             set nonfaultsTemp($nonscan_design) "$nonscan_design,Nofault,,module"
           }
         }
      }
   
      if {[info exists ::dft::nonscan_instances]} {
         foreach nonscan_instance $::dft::nonscan_instances {
           set regMatch 0
           foreach key [array names nonfaultsElement] {
              if {$key == " "} { continue }
              set reg_key [string map {"*" ".*"} $key]
              if {[regexp $reg_key $nonscan_instance]} {
                  set regMatch 1
                  continue
              }
           }
           if {$regMatch == "0"} {
             if {[info exists nonfaultsTemp($nonscan_instance)]} {
               set nonfaultsTemp($nonscan_instance) "$nonfaultsTemp($nonscan_instance):instance"
             } else {
               set nonfaultsTemp($nonscan_instance) "$nonscan_instance,Nofault,,instance"
             }
             #puts $wfd "$nonscan_instance,Nofault,,instance,,,,,,,,"
           }
         }
      }
   } else {
     puts "-WARN-    Do not provide nonScan would potentially cause coverage drop!!!"
   }
   
   
   if {[array size nonfaultsTemp] > 0} {
     foreach key [array names nonfaultsTemp] {
       puts $wfd "$nonfaultsTemp($key),,,,,,,,"
     }
   }
   foreach key [array names nonfaultsElement] {
     puts $wfd $nonfaultsElement($key)
   }
   
   if {[file exists $scanPath]} {
      puts "-INFO-    Found [exec realpath $scanPath]"
      puts "-INFO-    Extract scan chain info from scan path file..."
      set errorCode [extractScanChain scanPath]
      if {$errorCode != "0"} {
         puts "-E- (extractScanChain) -   Failed to extract scan chains... Please contact SAGE support"
         exit 1
      }
      set extractScanChain 1
      set scanChainPath "[exec realpath scan_chain.do]"
   
      puts $wfd "\n$scanChainPath,EDT_TEMPLATE,,,,,,,,,,"
   
   } else {
   
      puts "-E-    Scan Path not exists $scanPath"
   }
   
   close $wfd
   puts "-INFO-    Done generate csv $csv"
   
} else {	
   if {$outputDofile == "" } {
      puts "-E-     User do not provide -outputDofile switch!"
   }   
   set errorCode [extractNonUscSignal scanSignal outputDofile]
   if {$errorCode != "0"} {
      puts "-E- (extractNonUscSignal) - Failed to extract signal from $scanSignal file... Please contact SAGE support"
   } else {
      puts "-I- (extractNonUscSignal) - Successfully generated $outputDofile\n"   
   }
}  
