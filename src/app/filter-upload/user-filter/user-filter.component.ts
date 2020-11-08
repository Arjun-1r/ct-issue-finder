import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import * as XLSX from 'xlsx';
import { UserIssue } from '../model/user-issue';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { UserColumnIdentifier } from '../../shared/configurations/app.constants';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-user-filter',
  templateUrl: './user-filter.component.html',
  styleUrls: ['./user-filter.component.scss']
})
export class UserFilterComponent implements OnInit {
  // using the material provided components for pagination and sorting.
  @ViewChild(MatPaginator) userDataPaginator: MatPaginator;
  @ViewChild(MatSort) userDataSorting: MatSort;
  @ViewChild('csvInput') // to manage the file input. Eg clear the input.
  csvInputElement: ElementRef; // taking the element as object

  // readonly repeated values
  readonly lt = 'Less than or equal to';
  readonly gt = 'Greater than or equal to';
  readonly bt = 'Between';
  userData: UserIssue[];
  errorMessage: string;
  userDataSource = new MatTableDataSource();
  userDisplayedColumns: string[] = [];
  initColObjs: any[] = UserColumnIdentifier; // Because this is contant json stored in app contant file
  expectedHeader = this.initColObjs.map(value => value.col);
  rangeTypes = [this.gt, this.lt, this.bt];
  selectedRangeType: string;
  issueCountFilterForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.issueCountFilterForm = this.fb.group({
      selectedRangeType: new FormControl(this.lt, Validators.required),
      startValue: new FormControl(''),
      endValue: new FormControl('')
    });
    this.issueCountFilterForm.get('startValue').disable();
  }

  ngOnInit(): void {
  }

  onFileChange(evt: any): void {
    this.errorMessage = '';
    this.userData = [];
    const target: DataTransfer = (evt.target) as DataTransfer;
    if (target.files.length !== 1) {
      throw new Error('Cannot use multiple files');
    }
    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {
      /* read workbook */
      const bstr: string = e.target.result;
      const wb = XLSX.read(bstr, { type: 'binary', cellText: false, cellDates: true });
      /* grab first sheet */
      const wsname: string = wb.SheetNames[0];
      const ws: XLSX.WorkSheet = wb.Sheets[wsname];
      /* save data */
      const exceldata: any[] = XLSX.utils.sheet_to_json(ws, {
        header: 1, raw: false, dateNF: 'yyyy-mm-dd'
      });
      const formattedHeaders = exceldata[0].map(value => value.replaceAll(' ', '_').toLowerCase());
      this.userDisplayedColumns = formattedHeaders;

      // to validate the uploaded in file in specified format.
      if (this.headerValidator(this.expectedHeader, this.userDisplayedColumns)) {
        exceldata.slice(1, exceldata.length).forEach((datarow, index, array) => {
          const userData = {};
          formattedHeaders.forEach((header, headerIndex) => {
            userData[header] = datarow[headerIndex]; // assigning the row values to respective headers.
          });
          this.userData.push(userData as UserIssue); // getting the json data as user defined object.
          if (index === array.length - 1) {
            this.userDataSource = new MatTableDataSource(this.userData);
            setTimeout(() => {// wait till mat table taking the data.
              this.userDataSource.paginator = this.userDataPaginator;
              this.userDataSource.sort = this.userDataSorting;
            }, 500); // half a second of waiting

            // clearing the input because when the user try to upload same named file with edited content. 
            // It will not process the file. So taking the values and clearing the input.
            this.csvInputElement.nativeElement.value = '';
          }
        });
      } else {
        this.csvInputElement.nativeElement.value = '';
        this.errorMessage = 'Please upload valid CSV file. The header should First name, Sur name, Issue count,	Date of birth';
      }
    };

    reader.readAsBinaryString(target.files[0]);
  }
  // this method will be triggered on kepup in user input.
  searchBasedOnCount(event: Event): void {
    this.setDatasourcePredicate();
    const filterValue = (event.target as HTMLInputElement).value;
    if (this.selectedRangeType === this.bt) {
      // verify both start and end date count entered
      const formValues = this.issueCountFilterForm.value;
      if ((formValues.endValue && formValues.startValue) || (!formValues.endValue && !formValues.startValue)) {
        this.userDataSource.filter = filterValue.trim().toLowerCase();
      }
    } else {
      this.userDataSource.filter = filterValue.trim().toLowerCase();
    }
  }

  // accept only number for input fields
  numberOnly(event): boolean {
    const charCode = (event.which) ? event.which : event.keyCode;
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
      return false;
    }
    return true;
  }

  headerValidator(expectedHeaderArr, actualHeaderArr): boolean {
    if (expectedHeaderArr.length === actualHeaderArr.length &&
      expectedHeaderArr.every((value, index) => value === actualHeaderArr[index])) {
      return true;
    } else {
      return false;
    }
  }

  // to reset the search fields.
  resetSearch(hardReset = false): void {
    if (hardReset) {
      this.resetFormGroup();
    }
    this.setDatasourcePredicate();
    this.userDataSource.filter = '';
    this.issueCountFilterForm.get('startValue').disable();
    this.issueCountFilterForm.get('startValue').setValue('');
    this.issueCountFilterForm.get('endValue').enable();
  }

  // to reset the formgroup
  resetFormGroup(): void {
    this.issueCountFilterForm.reset();
    this.issueCountFilterForm.get('selectedRangeType').setValue(this.lt);
  }

  // toggle between various range selection. Facilitates the user to search in variety of inputs
  rangeChange(selectedValue): void {
    this.selectedRangeType = selectedValue;
    switch (selectedValue) {
      case this.lt:
        this.resetSearch();
        break;
      case this.gt:
        this.issueCountFilterForm.get('endValue').setValue('');
        this.issueCountFilterForm.get('endValue').disable();
        this.issueCountFilterForm.get('startValue').enable();
        break;
      default:
        this.issueCountFilterForm.get('endValue').enable();
        this.issueCountFilterForm.get('startValue').enable();
        break;
    }
  }


  // customized search method provided by material.
  setDatasourcePredicate(): void {
    const formValues = this.issueCountFilterForm.value;
    this.userDataSource.filterPredicate = (data: { issue_count: number }, filtersJson: string) => {
      let addValue = false;
      switch (formValues.selectedRangeType) {
        case this.lt:
          addValue = (data.issue_count <= Number(formValues.endValue)) ? true : false;
          break;
        case this.gt:
          addValue = (data.issue_count >= Number(formValues.startValue)) ? true : false;
          break;
        default:
          addValue = (data.issue_count >= Number(formValues.startValue)
            && data.issue_count <= Number(formValues.endValue)) ? true : false;
          break;
      }
      return addValue;
    };
  }
}
